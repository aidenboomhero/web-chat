import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect } from "react";
// Removed unused imports: BrowserRouter, Routes, Route, Navigate, useParams
import { nanoid } from "nanoid";

import { names, type ChatMessage, type Message } from "../shared";

function App() {
	// 1. Initialize name state as null, and let the useEffect set it.
	const [name, setName] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	
	const room = "EWHS2";

    // Ask the user for their name once when the component mounts
    useEffect(() => {
        // We use a simple prompt for now. In a real app, you'd use a custom modal UI.
        let userName = '';
        while (!userName || userName.trim() === '') {
             // Use window.prompt() to ask the user for their chat name.
             // We'll filter out names that are too long or contain inappropriate characters 
             // to keep it safe and fun.
             const input = window.prompt("Welcome! Please enter your desired chat name (1-15 characters):");
             
             if (input) {
                 const cleanedInput = input.trim().substring(0, 15);
                 // Simple check to ensure the name is not empty or too short after cleaning
                 if (cleanedInput.length > 0) {
                     userName = cleanedInput;
                 }
             }
        }
        
        setName(userName);
    }, []); // Empty dependency array ensures this runs only once

    // Don't connect the socket until we have a name
    const socket = usePartySocket({
		party: "chat",
		room,
		// Only connect if 'name' is set
        disabled: name === null, 
		onMessage: (evt) => {
			const message = JSON.parse(evt.data as string) as Message;
			if (message.type === "add") {
				const foundIndex = messages.findIndex((m) => m.id === message.id);
				if (foundIndex === -1) {
					// probably someone else who added a message
					setMessages((messages) => [
						...messages,
						{
							id: message.id,
							content: message.content,
							user: message.user,
							role: message.role,
						},
					]);
				} else {
					// this usually means we ourselves added a message
					// and it was broadcasted back
					// so let's replace the message with the new message
					setMessages((messages) => {
						return messages
							.slice(0, foundIndex)
							.concat({
								id: message.id,
								content: message.content,
								user: message.user,
								role: message.role,
							})
							.concat(messages.slice(foundIndex + 1));
					});
				}
			} else if (message.type === "update") {
				setMessages((messages) =>
					messages.map((m) =>
						m.id === message.id
							? {
									id: message.id,
									content: message.content,
									user: message.user,
									role: message.role,
								}
							: m,
					),
				);
			} else {
				setMessages(message.messages);
			}
		},
	});

    // Show a simple loading screen until the user enters their name
    if (name === null) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '20vh' }}>
                <h2>Waiting for name selection...</h2>
                <p>Please check for a pop-up asking for your chat name!</p>
            </div>
        );
    }

	return (
		<div className="chat container">
			{messages.map((message) => (
				<div key={message.id} className="row message">
					<div className="two columns user">{message.user}</div>
					<div className="ten columns">{message.content}</div>
				</div>
			))}
			<form
				className="row"
				onSubmit={(e) => {
					e.preventDefault();
					const content = e.currentTarget.elements.namedItem(
						"content",
					) as HTMLInputElement;
					const chatMessage: ChatMessage = {
						id: nanoid(8),
						content: content.value,
						user: name!, // Use the user-provided name
						role: "user",
					};
					setMessages((messages) => [...messages, chatMessage]);
					// we could broadcast the message here

					socket.send(
						JSON.stringify({
							type: "add",
							...chatMessage,
						} satisfies Message),
					);

					content.value = "";
				}}
			>
				<input
					type="text"
					name="content"
					className="ten columns my-input-text"
					placeholder={`Hello ${name}! Type a message...`}
					autoComplete="off"
				/>
				<button type="submit" className="send-message two columns">
					Send
				</button>
			</form>
		</div>
	);
}

// FIX 2: Simple render call without unnecessary routing wrappers.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
