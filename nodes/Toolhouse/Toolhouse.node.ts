import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import axios from 'axios';

const TOOLHOUSE_API = 'https://api.toolhouse.ai/v1';
const TOOLHOUSE_AGENT_URL = 'https://agents.toolhouse.ai';

export class Toolhouse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Toolhouse',
		name: 'toolhouse',
		icon: 'file:toolhouse.svg',
		documentationUrl: 'https://docs.toolhouse.ai/toolhouse',
		group: ['transform'],
		version: 1,
		description: 'Send and continue conversations with Toolhouse agent',
		defaults: {
			name: 'Toolhouse',
		},
		inputs: ['main'],
		outputs: ['main', 'main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Start Conversation', value: 'start' },
					{ name: 'Continue Conversation', value: 'continue' },
				],
				default: 'start',
				description: 'Choose whether to start a new conversation or continue an existing one',
			},
			{
				displayName: 'Agent Name or ID',
				name: 'agentId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
					loadOptionFunctions: [
						{
							name: 'Check Public/Private',
							value: 'checkPublicPrivate',
							description: 'Check if the selected agent is public or private',
						},
					],
				},
				default: '',
				description: 'Select a Toolhouse agent. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description: 'Message to send to Toolhouse agent',
			},
			{
				displayName: 'Run ID',
				name: 'runId',
				type: 'string',
				default: '',
				description: 'Run ID for continuing conversation',
				// Only show when operation is 'continue'
				displayOptions: {
					show: {
						operation: ['continue'],
					},
				},
			},
		],
		credentials: [
			{
				name: 'toolhouseApi',
				required: false,
			},
		],
	};

	methods = {
		loadOptions: {
			async getAgents(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials('toolhouseApi');
				if (!credentials || !credentials.token) {
					throw new NodeOperationError(this.getNode(), 'Unable to retrieve Toolhouse API credentials. Please check your configuration.');
				}
				const token = credentials.token;
				const headers: Record<string, string> = {
					'Authorization': `Bearer ${token}`,
				};
				const response = await axios.get(`${TOOLHOUSE_API}/agents`, { headers });
				return response.data.map((agent: { id: string; title: string; public?: boolean }) => ({
					name: `${agent.title} (${agent.public === false ? 'Private' : 'Public'})`,
					value: agent.id,
				}));
			},

			async checkPublicPrivate(this: ILoadOptionsFunctions) {
				const agentId = this.getNodeParameter('agentId') as string;
				const credentials = await this.getCredentials('toolhouseApi');
				if (!credentials || !credentials.token) {
					throw new NodeOperationError(this.getNode(), 'Unable to retrieve Toolhouse API credentials. Please check your configuration.');
				}
				const token = credentials.token;
				const headers: Record<string, string> = {
					'Authorization': `Bearer ${token}`,
				};
				const response = await axios.get(`${TOOLHOUSE_API}/agents/${agentId}`, { headers });
				const isPublic = response.data.public !== false;
				return [{
					name: isPublic ? 'Public Agent' : 'Private Agent',
					value: isPublic ? 'public' : 'private',
					description: isPublic ? 'This agent is public.' : 'This agent is private.',
				}];
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: [INodeExecutionData | null, INodeExecutionData | null][] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const agentId = this.getNodeParameter('agentId', i) as string;
			let agentIsPublic = true;
			const credentials = await this.getCredentials('toolhouseApi') as { token?: string };
			const token = credentials?.token || '';
			// Always fetch agent info at execution time
			if (agentId) {
				try {
					const headers: Record<string, string> = {};
					if (token) {
						headers['Authorization'] = `Bearer ${token}`;
					}
					const response = await axios.get(`${TOOLHOUSE_API}/agents/${agentId}`, { headers });
					agentIsPublic = response.data.public !== false;
				} catch (error: any) {
					if (error.response && error.response.status === 403) {
						const item = {
							json: {
								error: {
								message: 'You do not have access to this private agent.',
								status: 403,
								details: error.response.data || null,
							},
							runId: '',
							agentId: agentId,
							public: false,
						},
					};
					return [[], [item]];
					} else {
						throw error;
					}
				}
			}
			const message = this.getNodeParameter('message', i) as string;
			let runId = '';
			if (operation === 'continue') {
				runId = this.getNodeParameter('runId', i, '') as string;
			}
			let responseData;
			let newRunId = runId;
			let isError = false;

			const headers: Record<string, string> = {};
			if (!agentIsPublic && token) {
				headers['Authorization'] = `Bearer ${token}`;
			}

			try {
				if (operation === 'start') {
					// Start new conversation
					const response = await axios.post(
						`${TOOLHOUSE_AGENT_URL}/${agentId}`,
						{ message },
						{ headers },
					);
					responseData = response.data;
					newRunId = response.headers['x-toolhouse-run-id'] || '';
				} else {
					// Continue conversation
					const response = await axios.put(
						`${TOOLHOUSE_AGENT_URL}/${agentId}/${runId}`,
						{ message },
						{ headers },
					);
					responseData = response.data;
					// runId remains the same
				}
			} catch (error: any) {
				let status = error.response?.status || null;
				let details = error.response?.data || null;
				let message = error.message || 'Unknown error';
				responseData = {
					error: {
						message,
						status,
						details,
					},
				};
				isError = true;
			}

			const item = {
				json: {
					response: responseData,
					runId: newRunId,
					agentId: agentId,
					public: agentIsPublic,
				},
			};

			if (isError) {
				// Send to error output
				returnData.push([null, item]);
			} else {
				// Send to success output
				returnData.push([item, null]);
			}
		}

		// Transform returnData to match n8n's expected output shape
		const output1: INodeExecutionData[] = [];
		const output2: INodeExecutionData[] = [];
		for (const pair of returnData) {
			if (pair[0]) output1.push(pair[0]);
			if (pair[1]) output2.push(pair[1]);
		}
		return [output1, output2];
	}
} 