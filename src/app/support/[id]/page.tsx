import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SupportConfirmationClient } from "./support-confirmation-client";

export default async function SupportConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <SupportConfirmationClient id={id} />
      </main>
      <Footer />
    </div>
  );
}
