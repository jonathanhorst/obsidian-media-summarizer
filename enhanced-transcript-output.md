

## Transcript

*Enhanced with openai gpt-4o-mini*

### Introduction

[00:00]()

Last week, Google finally put Gemini in the command line, allowing you to hand total control of your machine over to artificial intelligence. It can write code, create files, execute commands automatically, and do everything else programmers used to get paid for. But once again, Google has showed up late to this party because we already have tools like Claude Code, OpenAI Codex, Warp, and countless others dominating the space.

### Key Concepts Discussion  

[00:30]()

But the Gemini CLI is different for two key reasons. One, it's the only major solution out there that's entirely open-source. And two, it's free to use with very generous usage limits. We're talking about a thousand free model requests per day to one of the most powerful coding models out there. By comparison, you'd likely need to pay $200 a month for Claude Pro Max Ultra to generate a similar amount of output. But as the old saying goes, you get what you pay for. In today's video, we'll find out if the Gemini CLI is any good.

It is June 30th, 2025, and you're watching the Code Report. As of today, Claude Code dominates the coding CLI space. They were the first major model provider to create a tool like this, and since then, it's been copied by OpenAI and now Gemini. You also have a bunch of third-party tools that can wrap various models, but Claude Code has two major problems. Not only is it closed source, but it's also extremely expensive. You'll find tales all over the internet of people dropping thousands of dollars to vibe code with it over a weekend. The sad reality is that 99% of those apps will never go on to recoup their token cost and actual revenue from customers.

That's sad, but Anthropic also just released a new feature that allows you to share your failures with everybody else. When you vibe code with Claude, it stores the results as artifacts. But now they have a new thing called Artifact Space, where you can host and share your artifacts publicly. This means you can fork other people's code and modify it with your own, which will lead to all sorts of opportunities to make the world a better place.

However, if you're too poor to afford Claude, a much better opportunity would be Gemini, which offers a crazy generous thousand model requests per day. To get started, install it with npm and then run the Gemini command. That should bring up a prompt field in your terminal where you can ask it to start building something on your machine.

### Technical Details

[02:00]()

My usual test for a new model is to have it build something with Svelte 5 and Runes. Most models fail at this, but I have seen Gemini succeed in the past, so let's find out if it can do it again. Like other CLI tools, it will start by building a plan, and then it will ask you for permission to execute various things on your machine. It might want to run some commands to install dependencies or use `mkdir` to create some new directories.

When vibe coding, I always make sure to give it permission to do everything and always approve changes without reviewing them first. When looking at the initial code, I was happy to see that Gemini actually used the new Svelte rune syntax. At first glance, this code actually looks pretty good. I think overall you can get pretty good code quality out of Gemini, even for Svelte. 

However, it struggled to actually get the app running. I let it run for about 30 minutes, but eventually, it just got stuck and could never figure out the solution. It appears to have run into an issue configuring the build tool Vite, and I don't blame it because that's always been the most painful part of being a web developer. Vite is awesome, but build tools like Webpack stole my childhood.

From there, I shut it down and then restarted it to see if it could debug its own code. Eventually, we got to a full working tic-tac-toe game. That's pretty cool, but overall, I'd have to say the experience is much rougher around the edges compared to Claude Code and other tools. It's a brand new tool, and if Google follows its typical pattern, it'll eventually become really good, and tons of people will use it. Then they'll kill it off a few years later. But right now, it's definitely a tool you should consider using for the price alone.

Speaking of which, another awesome tool you should know about is Mux, the sponsor of today's video. If you've ever tried integrating video into an application, you know it's deceptively easy to get started but difficult to get right. That's where Mux comes in. It gives you API-first video infrastructure that handles hosting, encoding, adaptive bitrate streaming, analytics, and even live streaming—all through a highly customizable API. 

The best part is that they now let you upload and store 10 videos and get 100,000 delivery minutes every month, all for free. So whether you're trying to vibe code a new project with awesome video features or you've already got millions of users like Typeform or Shopify, Mux can help you grow your needs without breaking your budget. Try it out for free at mux.com/fireship to get an additional $50 in credits.

This has been the Code Report. 

[04:10]() 

[Music]
