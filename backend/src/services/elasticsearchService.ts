import { Client, ClientOptions } from '@elastic/elasticsearch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ElasticsearchService - Real Elasticsearch/SIEM integration
 * Connects to Elasticsearch (self-hosted or Elastic Cloud) for security log querying
 */

interface ElasticsearchConfig {
    url: string;
    apiKey: string;
    verifyTls?: boolean;
    cloudId?: string;
    indexPattern?: string;
}

interface QueryResult {
    took: number;
    timedOut: boolean;
    total: number;
    hits: any[];
}

class ElasticsearchService {
    private client: Client | null = null;
    private config: ElasticsearchConfig | null = null;
    private connected: boolean = false;

    /**
     * Initialize connection to Elasticsearch
     */
    async connect(config: ElasticsearchConfig): Promise<{ success: boolean; message: string; clusterInfo?: any }> {
        try {
            const clientOptions: ClientOptions = {};

            // Use Cloud ID if provided, otherwise use URL
            if (config.cloudId) {
                clientOptions.cloud = { id: config.cloudId };
            } else if (config.url) {
                clientOptions.node = config.url;
            } else {
                return { success: false, message: 'Either URL or Cloud ID must be provided' };
            }

            // Set up authentication
            if (config.apiKey) {
                clientOptions.auth = { apiKey: config.apiKey };
            }

            // TLS verification
            if (config.verifyTls === false) {
                clientOptions.tls = { rejectUnauthorized: false };
            }

            this.client = new Client(clientOptions);
            this.config = config;

            // Test connection by getting cluster info
            const info = await this.client.info();

            this.connected = true;

            return {
                success: true,
                message: `Successfully connected to Elasticsearch cluster: ${info.cluster_name}`,
                clusterInfo: {
                    clusterName: info.cluster_name,
                    clusterUuid: info.cluster_uuid,
                    version: info.version.number,
                    tagline: info.tagline
                }
            };
        } catch (error: any) {
            this.connected = false;
            this.client = null;

            // Parse common errors
            let message = 'Connection failed: ';
            if (error.message?.includes('ECONNREFUSED')) {
                message += 'Connection refused - check if Elasticsearch is running and the URL is correct';
            } else if (error.message?.includes('ENOTFOUND')) {
                message += 'Host not found - check the URL or Cloud ID';
            } else if (error.statusCode === 401) {
                message += 'Authentication failed - check your API key';
            } else if (error.statusCode === 403) {
                message += 'Access denied - API key may lack required permissions';
            } else {
                message += error.message || 'Unknown error';
            }

            return { success: false, message };
        }
    }

    /**
     * Test current connection
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.client) {
            return { success: false, message: 'Not connected to Elasticsearch' };
        }

        try {
            const health = await this.client.cluster.health();
            return {
                success: true,
                message: `Cluster health: ${health.status} (${health.number_of_nodes} nodes, ${health.active_shards} active shards)`
            };
        } catch (error: any) {
            return { success: false, message: `Connection test failed: ${error.message}` };
        }
    }

    /**
     * Disconnect from Elasticsearch
     */
    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.connected = false;
            this.config = null;
        }
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    /**
     * Execute a KQL (Kibana Query Language) query
     * KQL is simpler syntax that gets converted to Elasticsearch DSL
     */
    async queryKql(kql: string, options?: {
        index?: string;
        from?: number;
        size?: number;
        sort?: string;
        timeRange?: { gte: string; lte: string };
    }): Promise<QueryResult> {
        if (!this.client) {
            throw new Error('Not connected to Elasticsearch');
        }

        const index = options?.index || this.config?.indexPattern || 'logs-*';

        // Build the query
        const query: any = {
            bool: {
                must: []
            }
        };

        // Add KQL query using query_string
        if (kql && kql.trim()) {
            query.bool.must.push({
                query_string: {
                    query: kql,
                    analyze_wildcard: true,
                    default_operator: 'AND'
                }
            });
        }

        // Add time range filter if provided
        if (options?.timeRange) {
            query.bool.must.push({
                range: {
                    '@timestamp': {
                        gte: options.timeRange.gte,
                        lte: options.timeRange.lte
                    }
                }
            });
        }

        try {
            const response = await this.client.search({
                index,
                query: query.bool.must.length > 0 ? query : { match_all: {} },
                from: options?.from || 0,
                size: options?.size || 100,
                sort: options?.sort ? [{ [options.sort]: { order: 'desc' as const } }] : [{ '@timestamp': { order: 'desc' as const } }]
            });

            return {
                took: response.took,
                timedOut: response.timed_out,
                total: typeof response.hits.total === 'number'
                    ? response.hits.total
                    : response.hits.total?.value || 0,
                hits: response.hits.hits.map(hit => ({
                    _index: hit._index,
                    _id: hit._id,
                    _score: hit._score,
                    _source: hit._source
                }))
            };
        } catch (error: any) {
            throw new Error(`KQL query failed: ${error.message}`);
        }
    }

    /**
     * Execute a raw Elasticsearch DSL query
     */
    async queryDsl(dslQuery: string | object, options?: {
        index?: string;
        from?: number;
        size?: number;
    }): Promise<QueryResult> {
        if (!this.client) {
            throw new Error('Not connected to Elasticsearch');
        }

        const index = options?.index || this.config?.indexPattern || 'logs-*';

        // Parse DSL if string
        let query: any;
        if (typeof dslQuery === 'string') {
            try {
                query = JSON.parse(dslQuery);
            } catch (e) {
                throw new Error('Invalid DSL query JSON');
            }
        } else {
            query = dslQuery;
        }

        try {
            // Spread the DSL query directly (flattened API)
            const searchParams: any = {
                index,
                ...query,
                from: options?.from || query.from || 0,
                size: options?.size || query.size || 100
            };

            const response = await this.client.search(searchParams);

            return {
                took: response.took,
                timedOut: response.timed_out,
                total: typeof response.hits.total === 'number'
                    ? response.hits.total
                    : response.hits.total?.value || 0,
                hits: response.hits.hits.map(hit => ({
                    _index: hit._index,
                    _id: hit._id,
                    _score: hit._score,
                    _source: hit._source
                }))
            };
        } catch (error: any) {
            throw new Error(`DSL query failed: ${error.message}`);
        }
    }

    /**
     * Get available indices matching a pattern
     */
    async getIndices(pattern?: string): Promise<string[]> {
        if (!this.client) {
            throw new Error('Not connected to Elasticsearch');
        }

        try {
            const response = await this.client.cat.indices({
                index: pattern || '*',
                format: 'json',
                h: 'index,health,status,docs.count'
            });

            return response.map((idx: any) => idx.index).filter((idx: string) => !idx.startsWith('.'));
        } catch (error: any) {
            throw new Error(`Failed to get indices: ${error.message}`);
        }
    }

    /**
     * Index a document (for logging C2 activity)
     */
    async indexDocument(index: string, document: object, id?: string): Promise<{ _id: string; result: string }> {
        if (!this.client) {
            throw new Error('Not connected to Elasticsearch');
        }

        try {
            const response = await this.client.index({
                index,
                id,
                body: {
                    '@timestamp': new Date().toISOString(),
                    ...document
                },
                refresh: true
            });

            return {
                _id: response._id,
                result: response.result
            };
        } catch (error: any) {
            throw new Error(`Failed to index document: ${error.message}`);
        }
    }

    /**
     * Bulk index multiple documents
     */
    async bulkIndex(index: string, documents: object[]): Promise<{ indexed: number; errors: number }> {
        if (!this.client) {
            throw new Error('Not connected to Elasticsearch');
        }

        const operations = documents.flatMap(doc => [
            { index: { _index: index } },
            { '@timestamp': new Date().toISOString(), ...doc }
        ]);

        try {
            const response = await this.client.bulk({
                body: operations,
                refresh: true
            });

            let indexed = 0;
            let errors = 0;
            response.items.forEach((item: any) => {
                if (item.index?.status === 201 || item.index?.status === 200) {
                    indexed++;
                } else {
                    errors++;
                }
            });

            return { indexed, errors };
        } catch (error: any) {
            throw new Error(`Bulk index failed: ${error.message}`);
        }
    }

    /**
     * Run an aggregation query
     */
    async aggregate(aggs: Record<string, any>, options?: {
        index?: string;
        query?: Record<string, any>;
        size?: number;
    }): Promise<any> {
        if (!this.client) {
            throw new Error('Not connected to Elasticsearch');
        }

        const index = options?.index || this.config?.indexPattern || 'logs-*';

        try {
            const searchParams: any = {
                index,
                query: options?.query || { match_all: {} },
                size: options?.size || 0,
                aggs
            };

            const response = await this.client.search(searchParams);

            return response.aggregations;
        } catch (error: any) {
            throw new Error(`Aggregation query failed: ${error.message}`);
        }
    }

    /**
     * Load configuration from database and connect
     */
    async initFromDatabase(): Promise<{ success: boolean; message: string }> {
        const config = await prisma.siemConfig.findUnique({ where: { id: 'default' } });

        if (!config || !config.url || !config.apiKey) {
            return { success: false, message: 'SIEM not configured - please set URL and API key' };
        }

        return this.connect({
            url: config.url,
            apiKey: config.apiKey,
            verifyTls: config.verifyTls,
            cloudId: config.cloudId || undefined,
            indexPattern: config.indexPattern || 'logs-*'
        });
    }
}

// Singleton instance
export const elasticsearchService = new ElasticsearchService();

// Export class for testing
export { ElasticsearchService };
