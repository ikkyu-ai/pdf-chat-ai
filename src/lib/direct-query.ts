// ...
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanChatMessage } from "langchain/schema";

const chat = new ChatOpenAI({
  temperature: 0.9,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

type callQueryArgs = {
    language: string;
    question: string;
    transformStream: TransformStream;
};


type callQueryExplainArgs = {
  question: string;
  transformStream: TransformStream;
};

const QA_TEMPLATE = (language: string, question: string) => `You need to response in ${language} with markdown format. 
  Translate and then explain "${question}"`;
const EXPLAIN_TEMPLATE = (question: string) => `Explain "${question}". 
  The first part of the response is short and concise. The second part is a detailed explaination.
  Response in markdown format.`;
const SUMMARIZE_TEMPLATE = (question: string) => `Summarize "${question}". 
  It should be short and concise.
  Response in markdown format.`;

// Function to call ChatGPT and get a response
export async function callDirectQuery({
    language,
    question,
    transformStream,
  }: callQueryArgs) {
    const chat = new ChatOpenAI({
        temperature: 0.9,
        openAIApiKey: process.env.OPENAI_API_KEY,
        streaming: true,
      });

    const encoder = new TextEncoder();
    const writer = transformStream.writable.getWriter();
  
    try {
        chat.call([new HumanChatMessage(QA_TEMPLATE(language, question))]).then(async (res) => {
        await writer.ready;
        setTimeout(async () => {
          await writer.ready;
          await writer.write(encoder.encode(`${res.content}`));
          await writer.write(encoder.encode("tokens-ended"));
          await writer.close();
        }, 100);
        
      });
      return transformStream?.readable;
    } catch (error) {
      console.error('Error calling ChatGPT:', error);
      throw new Error('Failed to get response from ChatGPT');
    }
  }



// Function to call ChatGPT and get a response
export async function callDirectQueryExplain({
  question,
  transformStream,
}: callQueryExplainArgs) {
  const chat = new ChatOpenAI({
      temperature: 0.9,
      openAIApiKey: process.env.OPENAI_API_KEY,
      streaming: true,
    });

  const encoder = new TextEncoder();
  const writer = transformStream.writable.getWriter();

  try {
      chat.call([new HumanChatMessage(EXPLAIN_TEMPLATE( question))]).then(async (res) => {
      await writer.ready;
      setTimeout(async () => {
        await writer.ready;
        await writer.write(encoder.encode(`${res.content}`));
        await writer.write(encoder.encode("tokens-ended"));
        await writer.close();
      }, 100);
      
    });
    return transformStream?.readable;
  } catch (error) {
    console.error('Error calling ChatGPT:', error);
    throw new Error('Failed to get response from ChatGPT');
  }
}

// Function to call ChatGPT and get a response
export async function callDirectQuerySummarize({
  question,
  transformStream,
}: callQueryExplainArgs) {
  const chat = new ChatOpenAI({
      temperature: 0.9,
      openAIApiKey: process.env.OPENAI_API_KEY,
      streaming: true,
    });

  const encoder = new TextEncoder();
  const writer = transformStream.writable.getWriter();

  try {
      chat.call([new HumanChatMessage(SUMMARIZE_TEMPLATE( question))]).then(async (res) => {
      await writer.ready;
      setTimeout(async () => {
        await writer.ready;
        await writer.write(encoder.encode(`${res.content}`));
        await writer.write(encoder.encode("tokens-ended"));
        await writer.close();
      }, 100);
      
    });
    return transformStream?.readable;
  } catch (error) {
    console.error('Error calling ChatGPT:', error);
    throw new Error('Failed to get response from ChatGPT');
  }
}