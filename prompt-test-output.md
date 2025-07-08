# Prompt Iteration Test Output

**Test Date:** 2025-07-08T07:38:29.369Z
**Video:** Google’s new CLI tool hits different…
**Channel:** Fireship
**Video URL:** https://www.youtube.com/watch?v=qqP1ucSiVkE
**Duration:** 4:10
**Model:** gpt-4o-mini
**Temperature:** 0.3
**Max Tokens:** 4000
**Transcript Segments:** 28

## Analysis
- Timestamps found: 0
- Section headings: 4
- Content paragraphs: 0
- Word count: 1

## Enhanced Transcript

### Introduction

[00:00]()

Last week, Google finally put Gemini in the command line, allowing you to hand total control of your machine over to artificial intelligence. It can write code, create files, execute commands automatically, and do everything else programmers used to get paid for.

[00:08]()

But once again, Google has showed up late to this party because we already have tools like Claude Code, OpenAI Codex, Warp, and countless others dominating the space. However, the Gemini CLI is different for two key reasons: one, it's the only major solution out there that's entirely open-source, and two, it's free to use with very generous usage limits.

[00:20]()

We're talking a thousand free model requests per day to one of the most powerful coding models out there. By comparison, you'd likely need to pay $200 a month for Claude Pro Max Ultra to generate a similar amount of output. But as the old saying goes, you get what you pay for, and in today's video, we'll find out if the Gemini CLI is any good.

### Key Concepts Discussion

[00:52]()

It is June 30th, 2025, and you're watching the Code Report. As of today, Claude Code dominates the vibe coding CLI space. They were the first major model provider to create a tool like this, and since then, it's been copied by OpenAI and now Gemini.

[01:02]()

You also have a bunch of third-party tools that can wrap various models, but Claude Code has two major problems. Not only is it closed-source, but it's also extremely expensive. You'll find tales all over the internet of people dropping thousands of dollars to vibe code with it over a weekend.

[01:12]()

The sad reality is that 99% of those apps will never go on to recoup their token cost in actual revenue from customers. That's sad, but Anthropic also just released a new feature that allows you to share your failures with everybody else. When you vibe code with Claude, it stores the results as artifacts, but now they have a new thing called artifact space where you can host and share your artifacts publicly.

[01:32]()

This means you can fork other people's code and modify it with your own, which will lead to all sorts of opportunities to make the world a better place. However, if you're too poor to afford Claude, a much better opportunity would be Gemini, which offers a crazy generous thousand model requests per day to get started.

### Technical Details

[01:49]()

Install it with npm and then run the Gemini command. That should bring up a prompt field in your terminal where you can ask it to start building something on your machine. My usual test for a new model is to have it build something with Svelte 5 and Runes. Most models fail at this, but I have seen Gemini succeed in the past, so let's find out if it can do it again.

[02:08]()

Like other CLI tools, it will start by building a plan, and then it will ask you for permission to execute various things on your machine. It might want to run some commands to install dependencies or use `mkdir` to create some new directories. When vibe coding, I always make sure to give it permission to do everything and always approve changes without reviewing them first.

[02:27]()

When looking at the initial code, I was happy to see that Gemini actually used the new Svelte rune syntax. At first glance, this code actually looks pretty good. I think overall, you can get pretty good code quality out of Gemini, even for Svelte, but it struggled to actually get the app running.

[02:36]()

I let it run for about 30 minutes, but eventually, it just got stuck and could never figure out the solution. It appears to have run into an issue configuring the build tool Vite, and I don't blame it because that's always been the most painful part of being a web developer. Vite is awesome, but build tools like Webpack stole my childhood.

[02:52]()

From there, I shut it down and then restarted it to see if it could debug its own code. Eventually, we got to a full working tic-tac-toe game. That's pretty cool, but overall, I'd have to say the experience is much rougher around the edges compared to Claude Code and other tools.

[03:01]()

It's a brand new tool, and if Google follows its typical pattern, it'll eventually become really good, that tons of people will use it, and then they'll kill it off a few years later. But right now, it's definitely a tool you should consider using for the price alone.

### Sponsorship

[03:10]()

Speaking of which, another awesome tool you should know about is Mux, the sponsor of today's video. If you've ever tried integrating video into an application, you know it's deceptively easy to get started but difficult to get right. That's where Mux comes in.

[03:27]()

It gives you API-first video infrastructure that handles hosting, encoding, adaptive bitrate streaming, analytics, and even live streaming, all through a highly customizable API. And the best part is that they now let you upload and store 10 videos and get 100,000 delivery minutes every month, all for free.

[03:36]()

So whether you're trying to vibe code a new project with awesome video features, or you've already got millions of users like Typeform or Shopify, Mux can help you grow your needs without breaking your budget. Try it out for free at mux.com/fireship to get an additional $50 in credits.

[04:04]()

This has been the Code Report.

## Raw Prompt Used

```
CONTEXT INFORMATION:
Video Title: "Google’s new CLI tool hits different…"
Channel: "Fireship"
Video Duration: 4:10 (250 seconds)
Description: "Try the best video API for developers (and get $50 in free credits) - https://mux.com/fireship

Google has finally put Gemini in the command line, allowing you to hand total control of your machine over to AI. But how is their solution different from all the other similar tools out there?

💬 Chat with Me on Discord

https://discord.gg/fireship

🔥 Get More Content - Upgrade to PRO

Upgrade at https://fireship.io/pro
Use code YT25 for 25% off PRO access 

🎨 My Editor Settings

- Atom One Dark 
- vscode-icons
- Fira Code Font

🔖 Topics Covered

* AI coding
* Gemini CLI
* Open-source AI agents
* Claude Code
* Svelte 5"

--- END OF CONTEXT ---

RAW TRANSCRIPT WITH TIMESTAMPS:
At 00:00 - last week Google finally put Gemini in the command line allowing you to hand total control of your machine over to artificial intelligence
At 00:08 - it can write code create files execute commands automatically and do everything else programmers used to get paid for
At 00:12 - but once again Google has showed up late to this party because we already have tools like Claude Code OpenAI Codeex Warp and
At 00:20 - countless others dominating the space but the Gemini CLI is different for two key reasons one it's the only major solution out there that's entirely open- source and two it's free to use with
At 00:32 - very generous usage limits we're talking a thousand free model requests per day to one of the most powerful coding models out there by comparison you'd likely need to pay $200 a month for
At 00:42 - Claude Pro Max Ultra to generate a similar amount of slop in your standard output but as the old saying goes you get what you pay for and in today's video we'll find out if the Gemini CLI
At 00:52 - is any good it is June 30th 2025 and you're watching the code report as of today Claude Code dominates the vibe coding CLI space they were the first major model provider to create a tool
At 01:02 - like this and since then it's been copied by OpenAI and now Gemini and then you also have a bunch of third party tools that can wrap various models but Claude Code has two major problems not
At 01:12 - only is it closed source but it's also extremely expensive you'll find tales all over the internet of people dropping thousands of dollars to vibe code with it over a weekend and the sad reality is
At 01:22 - that 99% of those apps will never go on to recoup their token cost and actual revenue from customers that's sad but Anthropic also just released a new feature that allows you to share your
At 01:32 - failures with everybody else when you vibe code with Claude it stores the results as artifacts but now they have a new thing called artifact space where you can host and share your artifacts
At 01:40 - publicly this means you can fork other people's slop and modify it with your own slop which will lead to all sorts of opportunities to make the world a better place however if you're too poor to
At 01:49 - afford Claude a much better opportunity would be Gemini which offers a crazy generous thousand model requests per day to get started install it with npm and then run the Gemini command that should
At 01:59 - bring up a prompt field in your terminal where you can ask it to start building something on your machine my usual test for a new model is to have it build something with spell 5 and runes most
At 02:08 - models fail at this but I have seen Gemini succeed in the past so let's find out if it can do it again like other CLI tools it will start by building a plan and then it will ask you for permission
At 02:18 - to execute various things on your machine like it might want to run some commands to install dependencies or use make dur to create some new directories when vibe coding I always make sure to
At 02:27 - give it permission to do everything and always approve changes without reviewing them first when looking at the initial code I was happy to see that Gemini actually used the new spell rune syntax
At 02:36 - and at first glance this code actually looks pretty good i think overall you can get pretty good code quality out of Gemini even for spelvel but but it struggled to actually get the app
At 02:44 - running i let it run for about 30 minutes but eventually it just got stuck and could never figure out the solution it appears to have run into an issue configuring the build tool V and I don't
At 02:52 - blame it because that's always been the most painful part of being a web developer vit is awesome but build tools like Webpack stole my childhood from there I shut her down and then restarted
At 03:01 - it to see if it could debug its own code and eventually we got to a full working tic-tac-toe game that's pretty cool but overall I'd have to say the experience is much rougher around the edges
At 03:10 - compared to Claude Code and other tools it's a brand new tool and if Google follows its typical pattern it'll eventually become really good that tons of people will use it and then they'll
At 03:18 - kill it off a few years later but right now it's definitely a tool you should consider using for the price alone speaking of which another awesome tool you should know about is MX the sponsor
At 03:27 - of today's video if you've ever tried integrating video into an application you know it's deceptively easy to get started but difficult to get right and that's where MX comes in it gives you
At 03:36 - API first video infrastructure that handles hosting encoding adaptive bit rate streaming analytics and even live streaming all through a highly customizable API and the best part is
At 03:46 - that they now let you upload and store 10 videos and get 100,000 delivery minutes every month all for free so whether you're trying to vibe code a new project with awesome video features or
At 03:56 - you've already got millions of users like Typeform or Shopify MX can help you grow your needs without breaking your budget try it out for free at mx.com/fireship
At 04:04 - to get an additional $50 in credits this has been the Code Report [Music]

--- END OF TRANSCRIPT ---

IMPORTANT: Your task is to clean up the raw transcript text while preserving the spoken words. Only add words to complete sentences. Add punctuation, proper capitalization, paragraph breaks, and organize into sections with timestamps.

STEP 1: First, analyze the transcript to determine how many speakers are present. Look for:
- Changes in voice/speaking style
- Conversational back-and-forth
- Interview format indicators
- Multiple distinct speaking patterns

STEP 2: Format the transcript based on your speaker analysis:

IF SINGLE SPEAKER (most common):
### Introduction

[00:00]()

Use the EXACT words from the transcript, just cleaned up. For example: "There's a new method to make Cursor and Windsurf 10 times smarter that no one's talking about. Claude Code just went public and now works directly inside your AI editors, making AI coding ridiculously powerful."

### Key Concepts Discussion  

[02:30]()

Continue with the exact spoken words from the transcript, organized by topic. Add punctuation and paragraph breaks but preserve what was actually said.

[03:45]()

Another paragraph with content.

### Technical Details

[05:45]()

Keep organizing the actual transcript content by topic, using the real words spoken, not summaries or paraphrases.

IF MULTIPLE SPEAKERS (only when clearly identifiable):
### Introduction

[00:00]()

**Host**
Use the exact words spoken by the host, cleaned up with punctuation: "Welcome to today's show. We're here with..."

**Guest**
Use the exact words spoken by the guest, cleaned up: "Thanks for having me. I'm excited to talk about..."

### Discussion

[02:30]()

**Host**
Continue with exact spoken words from the host, adding punctuation and organization but preserving the actual speech.

CRITICAL RULES:
- PRESERVE EXACT WORDS: Use the actual spoken words from the transcript
- CLEAN, DON'T REWRITE: Only add punctuation, capitalization, and organization - don't change the meaning
- Only list the speakers if more than one person is speaking
- Use ### topic-based headings
- TIMESTAMP BEFORE EVERY PARAGRAPH: format the timestamps as [HH:MM:SS]() on separate lines before EACH paragraph of content
- Group copy into logical paragraphs of 2-3 sentences
- CRITICAL: Place one timestamp before EACH paragraph. The timestamp should match the first line of content in that paragraph.
- TIMESTAMP VALIDATION: Use ONLY timestamps from the provided transcript data
- All output timestamps must be ≤ 4:10
- Fix spelling of names/technical terms by using the video title and description context
- Remove excessive filler words ("um," "uh," repetitive phrases) but keep the core spoken content

FORMAT EXAMPLE:
### Section Name

[00:00]()

First paragraph of content with exact spoken words, cleaned up.

[00:30]()

Second paragraph of content with exact spoken words, cleaned up.

[01:00]()

Third paragraph of content with exact spoken words, cleaned up.

Format the output as clean markdown.
```
