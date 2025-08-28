import {
  ICredentialType,
  INodeProperties,
  IAuthenticateGeneric,
  ICredentialTestRequest,
} from "n8n-workflow";

export class ToolhouseApi implements ICredentialType {
  name = "toolhouseApi";
  displayName = "Toolhouse API";
  documentationUrl =
    "https://docs.toolhouse.ai/toolhouse/agent-workers/running-agents-asynchronously/api-reference";
  icon = "file:toolhouse.svg";
  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "token",
      type: "string",
      typeOptions: {
        password: true,
      },
      default: "",
      description:
        "Find your Toolhouse API key in your Toolhouse dashboard at https://app.toolhouse.ai/settings/api-keys",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization: "=Bearer {{$credentials.token}}",
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "https://api.toolhouse.ai/",
      url: "v1/agents",
      method: "GET",
      headers: {
        Authorization: "=Bearer {{$credentials.token}}",
      },
    },
  };
}
