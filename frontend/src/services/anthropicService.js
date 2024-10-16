// /home/jack/ayyaihome/frontend/src/services/anthropicService.js

// Define an asynchronous function to generate an Anthropic AI response
export const generateAnthropicResponse = async (messages, onUpdate, ttsEnabled) => {
  try {
    // Format the messages, prefix "GPT: " for OpenAI assistant messages based on metadata
    const formattedMessages = messages.map(msg => {
      // Check if the message is from OpenAI assistant and add "GPT: " prefix
      if (msg.sender === "assistant" && msg.metadata?.assistantType === "openai") {
        return {
          role: "assistant",  // Keep the role as "assistant"
          content: `GPT: ${msg.text}`  // Add "GPT:" prefix to the content
        };
      } else if (msg.sender === "user") {
        // Add prefix for the logged-in user based on metadata
        const userPrefix = msg.metadata?.user && msg.metadata.user !== "Guest" ? `${msg.metadata.user}: ` : "";
        return {
          role: "user",  // Role is 'user'
          content: `${userPrefix}${msg.text}`  // Prefix content with user name, or leave as is for Guest
        };
      } else {
        // For assistant messages, handle them normally
        return {
          role: "assistant",
          content: msg.text
        };
      }
    });

    console.log("Formatted messages before sending to Anthropic:", formattedMessages);

    // Send the formatted messages and TTS state to the Anthropic backend
    const response = await fetch('http://localhost:8000/api/anthropic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: formattedMessages, ttsEnabled })  // Include ttsEnabled in the request body
    });

    // Wait until headers are available
    await new Promise((resolve) => setTimeout(resolve, 0));

    const requestId = response.headers.get('X-Request-ID');

    if (!response.ok) {
      throw new Error('Failed to send request to Anthropic backend');
    }

    // Process the streamed response
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullContent = "";

    let isFirstChunk = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onUpdate(fullContent, true);  // Indicate that the response is complete
        break;
      }
      const content = decoder.decode(value, { stream: true });
      fullContent += content;

      if (isFirstChunk) {
        isFirstChunk = false;
        onUpdate(fullContent, false, requestId);  // Pass requestId on the first update
      } else {
        onUpdate(fullContent);  // Subsequent updates
      }
    }
  } catch (error) {
    console.error('Error in generateAnthropicResponse:', error);
    throw error;
  }
};
