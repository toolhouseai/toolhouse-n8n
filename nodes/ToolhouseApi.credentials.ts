import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class ToolhouseApi implements ICredentialType {
  name = 'toolhouseApi';
  displayName = 'Toolhouse API';
  properties: INodeProperties[] = [
    {
      displayName: 'Token',
      name: 'token',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Your Toolhouse API token',
    },
  ];
} 