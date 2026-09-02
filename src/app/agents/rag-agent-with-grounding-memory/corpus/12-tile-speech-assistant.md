# Tile: Speech Assistant

The Speech Assistant is the second Live tile in Natural Language, and the first
tile in AI Arena that is not an agent at all — it talks to Azure Speech directly
through the Speech SDK. Say something and it writes down what it heard. Type
something and it reads it aloud. It does not answer questions; it converts
between speech and text in both directions.

The interesting part is pronunciation. The voice has been taught to say a short
list of words it would otherwise mangle: "STT" and "TTS" read out in full rather
than spelled, "i18n" and "l10n" read as the words they stand for, and "Umeå"
said roughly "OO-meh-oh". A visitor can hear the same sentence with and without
that training. Words that were not taught sound identical on both sides, which
is the control that makes the comparison meaningful.

Two things this tile makes concrete. First, a speech service has two independent
halves — recognising what was said, and choosing how a voice says it — and this
training fixes the speaking half only. It does not help the service hear a word
correctly. Second, the fixes live in a small XML pronunciation file in the repo;
the request points at its public address, Azure fetches it, and caches it for
fifteen minutes.

Speech is billed per second of audio in and per character spoken out, so the
token cap the chat tiles rely on would protect nothing here. This route caps 30
seconds of audio and 800 characters, checked before any Azure call, on its own
daily budget.

This tile was originally specified as a toggle between a speech app and a Speech
MCP agent. The MCP half needed an enterprise tier and a storage account, and
could not take a live microphone at all, so it was dropped and the tile's copy
corrected.
