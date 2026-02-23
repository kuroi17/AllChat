import Message from "./Message";
import NewMessagesDivider from "./NewMessagesDivider";

const messages = [
  {
    user: "Alex Rivera",
    color: "bg-blue-400",
    time: "10:42 AM",
    text: "Anyone knows if the Library is open late tonight for finals? 📚",
    me: false,
  },
  {
    user: "Me",
    color: "bg-red-600",
    time: "10:45 AM",
    text: "Yeah, they announced it's 24/7 this week! I'll be there around 8 PM.",
    me: true,
  },
  "divider",
  {
    user: "Maya Wong",
    color: "bg-teal-500",
    time: "11:02 AM",
    text: "Awesome! Does anyone want to start a study group for Bio Chem? 🚀 I have pizza vouchers!",
    me: false,
  },
  {
    user: "David Chen",
    color: "bg-indigo-400",
    time: "11:05 AM",
    text: "Count me in! I've been struggling with the Krebs cycle concepts. Let's meet at the Student Union 2nd floor?",
    me: false,
  },
  {
    user: "Me",
    color: "bg-red-600",
    time: "11:07 AM",
    text: "Can't make Bio Chem but I'm down for pizza later lol 🍕",
    me: true,
  },
];

export default function MessagesList() {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
      {messages.map((msg, i) =>
        msg === "divider" ? (
          <NewMessagesDivider key={i} />
        ) : (
          <Message key={i} {...msg} />
        ),
      )}
    </div>
  );
}
