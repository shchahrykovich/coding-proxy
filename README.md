# Coding Proxy

## About

A proxy for popular AI Coding Assistants. The proxy adds a shared memory and monitors AI adoption. [CodingProxy.com](https://codingproxy.com)

### Features
- Shared memory across sessions and users
- Monitors usage and adoption of AI coding assistants
- Supports multiple AI coding assistants
- Easy to deploy and configure via Cloudflare Workers

## Deploy to CloudFlare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shchahrykovich/coding-proxy)

### See it in action
[![Watch the video](https://img.youtube.com/vi/mMWbPDLgqgw/sddefault.jpg)](https://youtu.be/mMWbPDLgqgw)

### Steps to deploy
1. Make sure you have paid CloudFlare account, 5 USD per month
2. Crate a new API key for Anthropic
3. Click Deploy to Cloudflare button above
4. Click create private repository in CloudFlare
5. After the deploy a new private repository with this code will be created in your GitHub account
6. Create a new queue in your CloudFlare account with name "coding-proxy"
7. Update wrangler.jsonc with
```
"queues": {
    "producers": [
      {
        "binding": "QUEUE_NEW_REQUESTS",
        "queue": "coding-proxy"
      }
    ],
    "consumers": [
      {
        "queue": "coding-proxy",
        "max_batch_size": 10,
        "max_batch_timeout": 30,
        "max_retries": 3
      }
    ]
  },
```
8. Find url of newly created worker in your CloudFlare account
9. Go to {url}/sign-up to create an account
10. Enjoy!


## First usage
1. Create a new proxy in the app
2. For Claude Code update .claude/settings.local.json with this:
``` json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://{url}/api/proxy/{api_key}/anthropic"
  }
}
```


## Maintenance and new versions
Upstream repository: https://github.com/shchahrykovich/coding-proxy
