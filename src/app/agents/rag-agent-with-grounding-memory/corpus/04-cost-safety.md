# Cost Safety

AI Arena is a personal portfolio running on a real Azure subscription, so
controlling spend is a first-class concern. Azure services bill two ways, and
confusing them is the fastest route to a surprise bill. **Pay-per-call**
services (Azure OpenAI models, Foundry chat completions, Speech, Translator,
Azure Language) charge only when a request happens. **Provisioned** services
(Azure AI Search, custom Speech endpoints) bill by the hour whether or not
anyone uses them, because Azure reserves capacity. An idle app on a provisioned
resource still costs money around the clock.

AI Arena runs on pay-per-call by default. The one exception is the RAG Agent
tile, which needs Azure AI Search — so it uses Search's **Free tier**, the only
tier with no idle charge. Provisioning a Basic or Standard Search tier is the
tile's cost trap and is explicitly forbidden.

Every Next.js API route that calls Azure is wrapped in `withCostSafety(...)`,
which enforces three runtime layers: a **`max_tokens` cap** of 1000 tokens per
response; a **daily global budget** of 500 messages a day, counted in Netlify
Blobs keyed by UTC date and auto-resetting at midnight (over the cap returns a
friendly 429 with no model call); and a **kill switch**, the `KILL_SWITCH=true`
environment variable, which makes every playground return 503 "paused" without
redeploying. The middleware fails open — if the Blobs store is unreachable, the
token cap and kill switch still hold.

Beyond the runtime, every Azure resource lives in one dedicated resource group, so a single command deletes them all. Azure Cost Management sends
budget alerts at the $5, $10, and $20 thresholds. The nuclear option,
`az group delete --name {project_name} --yes`, wipes everything, and the whole
setup is redeployable from the repo.
