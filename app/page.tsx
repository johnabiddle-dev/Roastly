import Landing from "@/components/Landing";
import JsonLd from "@/components/JsonLd";
import { faqJsonLd, softwareApplicationJsonLd } from "@/lib/site";

export default function HomePage() {
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd} />
      <JsonLd data={faqJsonLd} />
      <Landing />
    </>
  );
}
