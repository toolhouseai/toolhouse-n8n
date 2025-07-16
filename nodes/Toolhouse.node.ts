import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import axios from 'axios';

const TOOLHOUSE_API = 'https://api.toolhouse.ai/v1';
const TOOLHOUSE_AGENT_URL = 'https://agents.toolhouse.ai';

export class Toolhouse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Toolhouse',
		name: 'toolhouse',
		icon: 'file:toolhouse.svg',
		group: ['transform'],
		version: 1,
		description: 'Send and continue conversations with Toolhouse agent',
		defaults: {
			name: 'Toolhouse',
			color: '#00b894',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main, NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{ name: 'Start Conversation', value: 'start' },
					{ name: 'Continue Conversation', value: 'continue' },
				],
				default: 'start',
				description: 'Choose whether to start a new conversation or continue an existing one',
			},
			{
				displayName: 'Agent',
				name: 'agentId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
				default: '',
				description: 'Select a Toolhouse agent',
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
				required: false,
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
					throw new Error('Unable to retrieve Toolhouse API credentials. Please check your configuration.');
				}
				const token = credentials.token;
				const headers: Record<string, string> = {
					'Authorization': `Bearer ${token}`,
				};
				const response = await axios.get(`${TOOLHOUSE_API}/agents`, { headers });
				return response.data.map((agent: { id: string; title: string }) => ({
					name: agent.title,
					value: agent.id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: [INodeExecutionData | null, INodeExecutionData | null][] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const agentId = this.getNodeParameter('agentId', i) as string;
			const credentials = await this.getCredentials('toolhouseApi') as { token?: string };
			const token = credentials?.token || '';
			const message = this.getNodeParameter('message', i) as string;
			let runId = '';
			if (operation === 'continue') {
				runId = this.getNodeParameter('runId', i, '') as string;
			}
			let responseData;
			let newRunId = runId;
			let isError = false;

			const headers: Record<string, string> = {};
			if (token) {
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
				responseData = { error: error.message, details: error.response?.data };
				isError = true;
			}

			const item = {
				json: {
					response: responseData,
					runId: newRunId,
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