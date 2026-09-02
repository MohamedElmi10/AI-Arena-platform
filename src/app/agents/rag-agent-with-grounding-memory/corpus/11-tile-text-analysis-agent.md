# Tile: Text Analysis Agent

The Text Analysis Agent is the first tile in the Natural Language module. Paste
any text and it breaks it down: the overall sentiment, the people, places and
organisations it mentions, and the key phrases that carry its meaning. It can
also redact personal data — names, emails, phone numbers — so text can be shared
or logged without leaking private details, which matters when the source is a
support ticket, a chat log, or a document.

A visitor might paste "The staff were lovely, but the room was filthy and the
food arrived cold" and get a mixed sentiment reading rather than a forced
positive or negative. Or ask it to redact "Sara Lind booked a table for two —
reach her on 070-123 45 67 or sara.lind@example.com" and get the name, number
and address masked. Sentiment comes back as positive, neutral or negative with a
confidence score, and genuinely mixed text is labelled mixed rather than averaged
into neutral.

Under the hood, Azure AI Language does the analysis and a Foundry-hosted agent
calls it as a tool and explains the result. One agent covers several Language
operations — sentiment, entities, key phrases, PII redaction — chosen to fit what
was asked. Text goes from the browser to a Next.js route to Azure; the Azure key
stays on the server and never reaches the browser.

This tile was originally specified as a toggle between Azure Language via Foundry
Tools and the Azure Language MCP server. It shipped as one wiring, and the tile's
copy was corrected rather than left promising a switch that isn't there.
