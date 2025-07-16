import {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeConnectionType,
} from 'n8n-workflow';

export class ToolhouseWebhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Toolhouse Webhook',
		name: 'toolhouseWebhook',
		icon: 'file:toolhouse.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle callbacks from Toolhouse agents',
		defaults: {
			name: 'Toolhouse Webhook',
			color: '#0984e3',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main, NodeConnectionType.Main], // 0: completed, 1: failed
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'toolhouse-callback',
			},
		],
		properties: [],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as {
			data: {
				run_id: string;
				status: string;
				last_agent_message: string;
			};
		};

		const item: INodeExecutionData = {
			json: {
				run_id: body.data.run_id,
				status: body.data.status,
				last_agent_message: body.data.last_agent_message,
			},
		};

		if (body.data.status === 'completed') {
			return { workflowData: [[item], []] };
		} else {
			// Any status other than 'completed' is considered failure
			return { workflowData: [[], [item]] };
		}
	}
} 