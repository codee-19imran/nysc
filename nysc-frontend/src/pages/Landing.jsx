import Hero from '../components/Hero'
import ImportantDates from '../components/ImportantDates'
import CallForPapersPreview from '../components/CallForPapersPreview'
import CommitteesPreview from '../components/CommitteesPreview'
import Sponsors from '../components/Sponsors'
import FAQ from '../components/FAQ'
import Theme from '../components/Theme'
import Tracks from '../components/Tracks'
import About from '../components/About'
import RegisterCTA from '../components/RegisterCTA'
import Host from '../components/Host'
import PhotoCarousel from '../components/PhotoCarousel'
import PageTransition from '../components/PageTransition'

export default function Landing() {
  return (
    <PageTransition>
      <main>
        <Hero />
        <About />
        <ImportantDates />
        <CallForPapersPreview />
        <Theme />
        <Tracks />
        <CommitteesPreview />
        <Sponsors />
        <PhotoCarousel />
        <FAQ />
        <Host />
        <RegisterCTA />
      </main>
    </PageTransition>
  )
}
