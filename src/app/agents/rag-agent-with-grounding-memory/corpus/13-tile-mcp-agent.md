# Tile: MCP Agent (Hosted + Own)

The MCP Agent is the fourth Live tile in Agents and the sequel to the
Function-Calling Agent. That tile hands the model tools written into its own
source. This one hands it tools it has never seen, fetched over the Model Context
Protocol at the moment the question is asked, from two different servers.

A switch above the chat chooses which server answers. **Hosted** points at
GitHub's own MCP server and knows the code history — "What were the last three
commits?" **Own** points at a small server Mohamed wrote that lives inside this
website, and knows what shipped — "How many demos are live here, and which
ones?" They deliberately answer different questions; making the second server a
worse copy of the first would have reduced the tile to two ways of reading a
repository.

Ask the hosted server what shipped and it will not know. That is the correct
behaviour, not a bug, and it is the clearest demonstration of what the toggle
actually changes. Every answer is prefixed with a line naming which server
replied, and if the model answers from memory without calling a tool at all, the
tile says so rather than presenting a guess as a lookup.

The own server is not a separate service. It is an ordinary route in this same
Next.js app, so it reads the same file the landing page reads — there is no copy
to keep in sync and no snapshot to go stale. The MCP specification permits a
plain JSON reply instead of a stream and makes sessions optional, so it needed no
SDK and no session store.

GitHub's server needs a credential: a read-only token scoped to this one
repository, stored in Azure rather than in the repo, never reaching the browser.
In the dev-time script the agent must ask permission before touching either
server and Mohamed types yes each time; on the public tile that is off, because
nobody is standing by to approve.

One MCP question costs roughly ten to twenty times a normal chat turn, because
every tool's full description is sent to the model on each request. The tile has
its own daily budget for that reason.
