import About from "../components/public/About";
import Hero from "../components/public/Hero";
import Lineup from "../components/public/Lineup";
import Listen from "../components/public/Listen";
import PublicFooter from "../components/public/PublicFooter";
import RequestForm from "../components/public/RequestForm";

export default function PublicBookingForm() {
  return (
    <div className="public-landing">
      <Hero />
      <About />
      <Lineup />
      <Listen />
      <RequestForm />
      <PublicFooter />
    </div>
  );
}
