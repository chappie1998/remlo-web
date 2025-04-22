import Header from "@/components/header";
import ClientBody from "./ClientBody";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ClientBody />
    </div>
  );
}
