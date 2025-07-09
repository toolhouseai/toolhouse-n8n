# Toolhouse n8n Custom Nodes

This package provides custom n8n nodes to integrate with [Toolhouse](https://toolhouse.ai), including:
- **Toolhouse**: Interact with Toolhouse agents (send/continue conversations)
- **Toolhouse Webhook**: Receive callbacks from Toolhouse agents

---

## Features
- Start and continue conversations with Toolhouse agents
- Securely store and use Toolhouse API tokens via n8n Credentials
- Dynamically select agents from your Toolhouse account
- Webhook node to handle agent callback events (completed/failed)
- Alternative flows for errors and status handling

---

## Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [n8n](https://n8n.io/) (locally or via Docker)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (for running in Docker)

---

## Setup & Build

> **First step:** Install dependencies
> ```sh
> npm install
> ```

1. **Install dependencies** (if you haven't already)
   ```sh
   npm install
   ```

2. **Build the nodes**
   ```sh
   npx tsc
   ```
   Compiled files will be in the `dist/` directory.

---

## Running with Docker Compose

A `docker-compose.yml` is provided. It will:
- Run n8n
- Mount your built custom nodes from `./dist` into the container

### **First Time Setup**
1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Build your custom nodes:**
   ```sh
   npx tsc
   ```
3. **Start n8n with Docker Compose:**
   ```sh
   docker compose up
   ```
   or (older versions)
   ```sh
   docker-compose up
   ```
4. **Access n8n:**
   - Open [http://localhost:5678](http://localhost:5678) in your browser.

### **Rebuilding After Changes**
- If you make changes to your TypeScript node files, you must rebuild before restarting Docker Compose:
  ```sh
  npx tsc
  docker compose down
  docker compose up
  ```
- This ensures the latest code is available in the container.

---

## Using the Custom Nodes

### 1. **Toolhouse Node**
- Add the **Toolhouse** node to your workflow.
- Select or create a **Toolhouse API** credential (store your API token securely).
- Select an agent from the dropdown (populated from your Toolhouse account).
- Enter your message and (optionally) a run ID to continue a conversation.
- The node supports two outputs:
  - **Output 1:** Success
  - **Output 2:** Error

### 2. **Toolhouse Webhook Node**
- Add the **Toolhouse Webhook** node to your workflow.
- Set your Toolhouse agent's `callback_url` to:
  ```
  https://<your-n8n-domain>/webhook/toolhouse-callback
  ```
- The node supports two outputs:
  - **Output 1:** status is `completed`
  - **Output 2:** status is `failed`
- The webhook receives and outputs:
  - `run_id`
  - `status`
  - `last_agent_message`

---

## Credentials Setup

1. In the n8n UI, go to **Credentials**.
2. Create a new credential of type **Toolhouse API**.
3. Enter your Toolhouse API token.
4. Select this credential in the Toolhouse node.

---

## Debugging & Troubleshooting

- Use `console.log()` in your node code to print debug info (viewable in Docker logs or terminal).
- Check the n8n UI **Executions** tab for workflow run details and errors.
- If credentials are not found:
  - Ensure the credential name matches everywhere (`toolhouseApi`)
  - Rebuild (`npx tsc`) and restart Docker/n8n
  - Check that `dist/nodes/ToolhouseApi.credentials.js` is present and mounted
  - Check logs for errors

---

## Advanced: VS Code Debugging

You can run n8n in debug mode and attach a debugger:
- Add to your `docker-compose.yml`:
  ```yaml
  command: node --inspect=0.0.0.0:9229 /usr/local/lib/node_modules/n8n/bin/n8n
  ports:
    - 9229:9229
  ```
- Attach VS Code to `localhost:9229`

---

## References
- [n8n Docs: Custom Nodes](https://docs.n8n.io/integrations/creating-nodes/build/programmatic-style-node/)
- [n8n Docs: Docker](https://docs.n8n.io/hosting/docker/)
- [Toolhouse](https://toolhouse.ai)

---

## License
MIT 