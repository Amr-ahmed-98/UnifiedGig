import type { PromptCategory } from '@/types/prompt'

export interface StarterPrompt {
    category: PromptCategory
    title: string
    body: string
    tools: string[]
}

/** Seed content for the prompt library — also reused as demo data. */
export const STARTER_PROMPTS: StarterPrompt[] = [
    {
        category: 'programming',
        title: 'Senior code review',
        body: 'Act as a senior [language] engineer. Review the code below for bugs, security issues, performance problems and readability. For each issue: quote the line, explain why it matters, and show the corrected code. Finish with a short summary of the 3 most important fixes.\n\n[paste code]',
        tools: ['ChatGPT', 'Claude', 'Gemini'],
    },
    {
        category: 'programming',
        title: "Explain an error like I'm new",
        body: 'I got this error while working with [framework/tool]:\n\n[paste error]\n\nExplain in plain language what it means, list the most likely causes in order, and give me the exact steps to fix each one. Ask me for more context if you need it.',
        tools: ['ChatGPT', 'Claude'],
    },
    {
        category: 'images',
        title: 'Professional headshot',
        body: 'Professional LinkedIn headshot of a [age] [gender] [profession], wearing [outfit], soft natural window light, neutral light-grey background, shallow depth of field, shot on 85mm lens, friendly confident expression, photorealistic, high detail.',
        tools: ['Midjourney', 'DALL·E', 'Gemini'],
    },
    {
        category: 'images',
        title: 'Product photo on clean background',
        body: 'Studio product photo of [product], centered on a seamless [color] background, soft diffused key light from the left, subtle reflection on the surface, minimal props, commercial e-commerce style, 4k, sharp focus.',
        tools: ['Midjourney', 'Firefly'],
    },
    {
        category: 'video',
        title: 'Cinematic B-roll shot',
        body: 'A slow cinematic dolly-in shot of [subject] in [location] at golden hour. Warm light, gentle lens flare, 24fps film look, shallow depth of field, calm atmosphere. Duration 8 seconds, no text on screen.',
        tools: ['Sora', 'Runway', 'Veo'],
    },
    {
        category: 'video',
        title: 'Short-form video script',
        body: 'Write a 45-second vertical video script about [topic] for [audience]. Structure: a 3-second hook, 3 quick value points, and a call to action. Include on-screen text and B-roll suggestions for each line.',
        tools: ['ChatGPT', 'Claude'],
    },
    {
        category: 'career',
        title: 'Tailor my CV to a job post',
        body: "Here is a job description:\n[paste job post]\n\nHere is my CV:\n[paste CV]\n\nRewrite my experience bullet points to match the role using the job's keywords, keep everything truthful, quantify results where possible, and list any skills gaps I should address before applying.",
        tools: ['ChatGPT', 'Claude', 'Gemini'],
    },
    {
        category: 'career',
        title: 'Mock interview partner',
        body: 'Act as an interviewer for a [job title] role at a [company type]. Ask me one question at a time, mixing technical and behavioural questions. After each answer, score it out of 10 and tell me how to improve it before moving on.',
        tools: ['ChatGPT', 'Claude'],
    },
    {
        category: 'writing',
        title: 'Cold message to a recruiter',
        body: 'Write a short LinkedIn message (under 80 words) to a recruiter at [company] about the [role] opening. Mention one specific achievement: [achievement]. Friendly, confident, no clichés, end with a simple question.',
        tools: ['ChatGPT', 'Claude'],
    },
]
