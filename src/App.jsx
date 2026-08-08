import { useEffect, useState } from 'react'
import {
  ArrowRight, BarChart3, Box, Check, ChevronDown, CircleCheck, Clock3, Code2,
  Globe2, Headphones, Instagram, Linkedin, Mail, MapPin, Menu, PackageCheck,
  PackageSearch, Phone, Plane, Route, Scale, Search, ShieldCheck, Sparkles,
  Truck, Warehouse, X, Zap,
} from 'lucide-react'
import { Link, NavLink, Route as RouterRoute, Routes, useLocation } from 'react-router-dom'

const navItems = [
  ['Tracking', '/tracking'],
  ['Rate calculator', '/rate-calculator'],
  ['Weight calculator', '/weight-calculator'],
]

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

function Logo({ light = false }) {
  return <img className="brand-logo" src={light ? '/assets/fastshipindia-logo-light.svg' : '/assets/fastshipindia-logo.svg'} alt="Fastship India" />
}

function Header() {
  const [open, setOpen] = useState(false)
  return <header className="site-header">
    <div className="nav-shell">
      <Link to="/" className="brand" onClick={() => setOpen(false)}><Logo /></Link>
      <nav className={`main-nav ${open ? 'is-open' : ''}`}>
        {navItems.map(([label, to]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}
        <NavLink className="nav-track" to="/tracking" onClick={() => setOpen(false)}><Search size={16} /> Track a parcel</NavLink>
      </nav>
      <div className="nav-actions"><Link className="button button-dark button-small" to="/rate-calculator">Start shipping <ArrowRight size={15} /></Link></div>
      <button className="menu-button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </div>
  </header>
}

function ButtonLink({ children, to = '/rate-calculator', dark = false }) { return <Link className={`button ${dark ? 'button-dark' : 'button-coral'}`} to={to}>{children}<ArrowRight size={17} /></Link> }

function Eyebrow({ children, icon: Icon = Sparkles }) { return <span className="eyebrow"><Icon size={15} /> {children}</span> }

function Home() {
  return <div className="home-stack">
    <section className="hero home-stack-card">
      <div className="hero-backdrop" />
      <div className="hero-grid-lines" />
      <div className="shell hero-layout">
        <div className="hero-copy reveal-up">
          <Eyebrow icon={Route}>SHIP WITH INTENT</Eyebrow>
          <h1>Move good things <em>forward.</em></h1>
          <p>Fastship India brings routing, rates, visibility and real human support into one calm command centre for modern Indian businesses.</p>
          <div className="hero-actions"><ButtonLink>Find your fastest route</ButtonLink><Link className="under-link" to="/tracking">See how tracking works <ArrowRight size={16} /></Link></div>
          <div className="hero-proof"><span><CircleCheck size={16} /> Built for India</span><span><CircleCheck size={16} /> 29,000+ pin codes</span></div>
        </div>
      </div>
      <div className="hero-marquee"><div className="marquee-track"><span>DOMESTIC</span><i /> <span>FULFILMENT</span><i /> <span>CROSS-BORDER</span><i /> <span>INTELLIGENCE</span><i /> <span>DOMESTIC</span><i /> <span>FULFILMENT</span><i /></div></div>
    </section>
    <section className="manifesto band-ivory home-stack-card"><div className="shell split-intro"><Eyebrow icon={Zap}>THE FASTSHIP INDIA METHOD</Eyebrow><h2>Less chasing.<br /><em>More moving.</em></h2><div><p>Shipping is a promise made in public. We make the behind-the-scenes feel simple, so your customers experience the confidence.</p><ButtonLink dark to="/about">Our point of view</ButtonLink></div></div></section>
    <section className="feature-section home-stack-card"><div className="shell"><div className="section-head"><div><Eyebrow icon={Sparkles}>ONE CLEAR WORKFLOW</Eyebrow><h2>A better day<br /><em>for every parcel.</em></h2></div><p>Whether you are sending one order or ten thousand, every decision lives in one beautifully organised place.</p></div><div className="feature-grid"><FeatureCard index="01" icon={Route} title="Choose the right route" copy="Compare speed, cost and courier fit before a single label is printed." tone="blue" /><FeatureCard index="02" icon={PackageCheck} title="Keep every promise visible" copy="Give your team and your customers a clear view from pickup to doorstep." tone="coral" /><FeatureCard index="03" icon={BarChart3} title="Grow from the signal" copy="Turn shipping data into better margins, smoother operations and happier buyers." tone="lime" /></div></div></section>
    <FeatureShowcase />
    <section className="image-story home-stack-card"><div className="shell image-story-grid"><div className="story-image"><img src="/assets/shipray-strength-india.jpg" alt="Fastship India delivery network across India" /></div><div className="story-copy"><Eyebrow icon={Globe2}>MADE FOR THE LONG WAY</Eyebrow><h2>Local knowledge.<br /><em>Global ambition.</em></h2><p>From a first order in a home studio to a brand shipping around the world, Fastship India grows with the people behind every package.</p><div className="stat-line"><strong>220+</strong><span>countries and territories<br />within reach</span></div><ButtonLink to="/integrations/courier-partners">Explore the network</ButtonLink></div></div></section>
    <section className="home-steps home-stack-card"><div className="shell"><Eyebrow icon={PackageCheck}>FROM CLICK TO DOORSTEP</Eyebrow><h2>A simple rhythm for<br /><em>complex movement.</em></h2><div className="step-grid"><div><span>01</span><h3>Plan</h3><p>Understand the route, weight and delivery promise before the parcel leaves.</p></div><div><span>02</span><h3>Move</h3><p>Give every handoff a clear next action, from pickup to hub to doorstep.</p></div><div><span>03</span><h3>Learn</h3><p>Use the signals from every shipment to make the next one even better.</p></div></div></div></section>
    <Testimonials />
    <section className="quote-band home-stack-card"><div className="shell quote-grid"><span className="quote-mark">“</span><blockquote>Shipping should feel like momentum, not administration.</blockquote><span className="quote-caption">THE FASTSHIP INDIA PROMISE</span></div></section>
    <div className="home-stack-card"><FinalCta /></div>
  </div>
}

function FeatureShowcase() {
  return <section className="feature-showcase home-stack-card"><div className="shell"><div className="section-head showcase-head"><div><Eyebrow icon={Zap}>MORE THAN A LABEL</Eyebrow><h2>Small details.<br /><em>Big distance.</em></h2></div><p>Fastship India gives operators the practical tools and the breathing room to make good decisions quickly.</p></div><div className="showcase-grid"><article className="showcase-photo showcase-wide reveal-on-view"><img src="/assets/shipray-control-tower.jpg" alt="Operations team monitoring shipments" /><div className="showcase-overlay"><span>01</span><strong>One view of the whole journey</strong><small>Watch handoffs, exceptions and delivery signals move together.</small></div></article><article className="showcase-photo reveal-on-view"><img src="/assets/shipray-rate-studio.jpg" alt="Shipping rates and parcel decisions" /><div className="showcase-overlay"><span>02</span><strong>Know the number before the promise</strong><small>Build a stronger margin into every route.</small></div></article><article className="showcase-note reveal-on-view"><div className="note-symbol"><Route /></div><span>BUILT FOR THE EVERYDAY</span><h3>Clarity is a competitive advantage.</h3><p>From a packed shelf to a customer’s doorstep, every part of the path should feel considered.</p><Link to="/integrations">See the platform <ArrowRight size={16} /></Link></article></div></div></section>
}

function Testimonials() {
  const quotes = [
    ['“We stopped losing mornings to courier portals. The team can see what matters and act on it.”', 'Rhea Mehta', 'Operations lead, Rooted Earth'],
    ['“The rate view makes a complicated choice feel very human. We can move faster without guessing.”', 'Arjun Shah', 'Founder, Northstar Goods'],
    ['“Our customers feel the difference because every update arrives with the right context.”', 'Maya Iyer', 'CX manager, Common Thread'],
  ]
  return <section className="testimonials home-stack-card"><div className="shell"><div className="section-head compact"><div><Eyebrow icon={CircleCheck}>PEOPLE IN MOTION</Eyebrow><h2>Good journeys<br /><em>sound like this.</em></h2></div></div><div className="testimonial-grid">{quotes.map(([quote, name, role], index) => <article className="testimonial reveal-on-view" key={name}><div className="testimonial-stars">✦ ✦ ✦ ✦ ✦</div><blockquote>{quote}</blockquote><div className="testimonial-person"><span>{name.slice(0, 1)}</span><div><strong>{name}</strong><small>{role}</small></div></div><i className="testimonial-line" style={{ '--delay': `${index * 0.8}s` }} /></article>)}</div></div></section>
}

function FeatureCard({ index, icon: Icon, title, copy, tone }) { return <article className={`feature-card tone-${tone} reveal-on-view`}><div className="card-top"><span>{index}</span><Icon size={22} /></div><h3>{title}</h3><p>{copy}</p><Link to="/integrations">Learn more <ArrowRight size={16} /></Link></article> }

const pageData = {
  integrations: { eyebrow: 'THE PLATFORM', title: 'The calm behind every delivery.', copy: 'One connected operating layer for orders, routes, rates and customer confidence.', icon: Sparkles, image: '/assets/shipray-network-studio.jpg', imageAlt: 'A modern logistics operations network', cards: [['Order intelligence', 'Bring every order into a workflow your team can actually scan.', BarChart3], ['Courier orchestration', 'Match each shipment with the partner, service and SLA it needs.', Truck], ['Customer visibility', 'Make milestones clear enough to reduce the “where is my order?” loop.', PackageSearch], ['Flexible integrations', 'Connect the shop, warehouse and tools you already trust.', Code2]] },
  salesChannels: { eyebrow: 'SALES CHANNELS', title: 'Every storefront, one rhythm.', copy: 'Connect the places your customers shop and let Fastship India keep the movement in sync.', icon: Warehouse, image: '/assets/shipray-smart-booking.jpg', imageAlt: 'Seller preparing a smart shipment booking', cards: [['Marketplace ready', 'Bring marketplace orders into the same dispatch language.', Box], ['Storefront sync', 'Keep inventory, order details and delivery intent connected.', Code2], ['Smart notifications', 'Send useful updates without adding noise to the journey.', Mail], ['Built to scale', 'Start with one channel and add the next when the moment is right.', Zap]] },
  courierPartners: { eyebrow: 'COURIER NETWORK', title: 'The right partner for every route.', copy: 'Compare on what matters: serviceability, speed, cost and the experience you want to create.', icon: Route, image: '/assets/shipray-fulfilment-network.jpg', imageAlt: 'Connected fulfilment network with parcels ready to move', cards: [['Intelligent matching', 'Make every booking with route-level context, not guesswork.', Sparkles], ['Wide serviceability', 'Reach metro, tier 2, tier 3 and remote locations with confidence.', MapPin], ['SLA visibility', 'See what is moving smoothly and what needs a closer look.', Clock3], ['Multi-mode delivery', 'Balance express, surface, air, cargo and local movement.', Plane]] },
  blogs: { eyebrow: 'THE JOURNAL', title: 'Notes for moving better.', copy: 'Practical thinking for operators, makers and teams building what comes next.', icon: Sparkles, image: '/assets/shipray-strength-businesses.jpg', imageAlt: 'Business team preparing products for delivery', cards: [['The shipping brief', 'A clearer way to think about rates, margins and delivery promises.', Route], ['Operator notes', 'Small changes that make a surprisingly large difference in a shipping day.', BarChart3], ['Glossary of movement', 'The useful version of logistics language, without the fog.', Box], ['Field guide', 'Ideas for taking your next order from packed to promised.', Globe2]] },
  about: { eyebrow: 'ABOUT FASTSHIP INDIA', title: 'Built for the people who keep moving.', copy: 'We believe logistics is a creative problem: make the path clearer, and more good things can travel further.', icon: HeartIcon, image: '/assets/shipray-strength-couriers.jpg', imageAlt: 'Courier partner preparing a delivery', cards: [['Clarity first', 'Simple rates, readable milestones and practical next actions.', Sparkles], ['Human when needed', 'Real support for the exceptions software cannot resolve alone.', Headphones], ['Always improving', 'Better decisions informed by route and performance signals.', BarChart3], ['Long-term thinking', 'Build the infrastructure that makes tomorrow feel possible.', ShieldCheck]] },
}

function HeartIcon(props) { return <CircleCheck {...props} /> }

function StandardPage({ type }) { const data = pageData[type]; const Icon = data.icon; return <><section className="page-hero"><div className="page-spark spark-one" /><div className="page-spark spark-two" /><div className="shell page-hero-grid"><div><Eyebrow icon={Icon}>{data.eyebrow}</Eyebrow><h1>{data.title}</h1><p>{data.copy}</p><div className="hero-actions"><ButtonLink>Start with a route</ButtonLink><Link className="under-link" to="/contact">Talk to our team <ArrowRight size={16} /></Link></div></div><div className="page-photo"><img src={data.image} alt={data.imageAlt} /><div className="photo-chip"><CircleCheck size={15} /><span>Built for the real world</span></div><span className="photo-orbit" /></div></div></section><section className="card-section"><div className="shell"><div className="section-head compact"><div><Eyebrow icon={Sparkles}>WHAT YOU GET</Eyebrow><h2>Tools that earn<br /><em>their place.</em></h2></div></div><div className="feature-grid">{data.cards.map(([title, copy, CardIcon], i) => <FeatureCard key={title} index={`0${i + 1}`} icon={CardIcon} title={title} copy={copy} tone={['blue', 'coral', 'lime', 'ink'][i]} />)}</div></div></section><FinalCta /></> }

function ToolShell({ eyebrow, title, copy, children, image }) { return <section className="tool-page"><div className="shell tool-grid"><div className="tool-intro"><Eyebrow icon={Scale}>{eyebrow}</Eyebrow><h1>{title}</h1><p>{copy}</p><ul className="check-list"><li><Check size={16} /> Clear inputs, useful outputs</li><li><Check size={16} /> Built around Indian routes</li><li><Check size={16} /> No guesswork at checkout</li></ul>{image && <img className="tool-art-image" src={image} alt="Fastship India shipping tool" />}</div>{children}</div></section> }

function WeightCalculator() { const [value, setValue] = useState('2'); const [length, setLength] = useState('20'); const [width, setWidth] = useState('15'); const [height, setHeight] = useState('10'); const actual = Number(value) || 0; const volumetric = ((Number(length) || 0) * (Number(width) || 0) * (Number(height) || 0)) / 5000; const chargeable = Math.max(actual, volumetric).toFixed(2); return <ToolShell eyebrow="WEIGHT TOOL" title="Know what your parcel weighs." copy="Calculate the chargeable weight before you choose a service, so the estimate starts on solid ground." image="/assets/shipray-weight-calculator.png"><div className="tool-card"><div className="tool-card-head"><div><span>Chargeable weight</span><small>Use centimetres and kilograms</small></div><Scale /></div><label>Actual weight (kg)<input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} /></label><div className="input-row"><label>Length (cm)<input type="number" min="0" value={length} onChange={e => setLength(e.target.value)} /></label><label>Width (cm)<input type="number" min="0" value={width} onChange={e => setWidth(e.target.value)} /></label><label>Height (cm)<input type="number" min="0" value={height} onChange={e => setHeight(e.target.value)} /></label></div><div className="result-box"><small>Chargeable weight</small><strong>{chargeable} <span>kg</span></strong><p>Actual {actual.toFixed(2)} kg · Volumetric {volumetric.toFixed(2)} kg</p></div><ButtonLink dark to="/rate-calculator">Use this for a rate</ButtonLink></div></ToolShell> }

function RateCalculator() { const [from, setFrom] = useState('380001'); const [to, setTo] = useState('560001'); const [weight, setWeight] = useState('1'); const [result, setResult] = useState(null); function calculate(e) { e.preventDefault(); const base = Math.max(55, 48 + (Number(weight) || 1) * 28 + (from.slice(0, 2) === to.slice(0, 2) ? 12 : 32)); setResult({ rate: Math.round(base), days: from.slice(0, 2) === to.slice(0, 2) ? '1–2 days' : '2–4 days' }) } return <ToolShell eyebrow="RATE TOOL" title="See the route before you book." copy="Get an indicative shipping cost with the details that shape the journey: origin, destination and weight."><form className="tool-card" onSubmit={calculate}><div className="tool-card-head"><div><span>Route estimate</span><small>Indicative domestic pricing</small></div><Route /></div><div className="input-row"><label>Pickup pincode<input required pattern="[0-9]{6}" value={from} onChange={e => setFrom(e.target.value)} /></label><label>Delivery pincode<input required pattern="[0-9]{6}" value={to} onChange={e => setTo(e.target.value)} /></label></div><label>Parcel weight (kg)<input required type="number" min="0.1" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /></label><button className="button button-coral full" type="submit">Calculate route <ArrowRight size={17} /></button>{result && <div className="result-box result-rate"><div><small>Estimated from</small><strong>₹{result.rate}</strong></div><div><small>Typical delivery</small><b>{result.days}</b></div></div>}</form></ToolShell> }

function Tracking() { const [id, setId] = useState(''); const [searched, setSearched] = useState(false); return <ToolShell eyebrow="LIVE VISIBILITY" title="Follow the good news." copy="Enter an AWB or order ID to see a clear, readable shipment journey from pickup to doorstep." image="/assets/shipray-tracking.png"><form className="tool-card tracking-card" onSubmit={e => { e.preventDefault(); setSearched(true) }}><div className="tool-card-head"><div><span>Track a shipment</span><small>Try any order ID for a demo timeline</small></div><PackageSearch /></div><label>AWB or order ID<input value={id} onChange={e => setId(e.target.value)} placeholder="e.g. FSS123456" required /></label><button className="button button-dark full" type="submit">Show journey <ArrowRight size={17} /></button>{searched && <div className="timeline"><div className="timeline-status"><CircleCheck /><span><strong>In transit</strong><small>Updated just now · Ahmedabad hub</small></span></div>{['Order packed', 'Picked up', 'Moving through the network', 'Out for delivery'].map((item, i) => <div className={`timeline-item ${i < 3 ? 'done' : ''}`} key={item}><span>{i < 3 ? <Check size={13} /> : <Clock3 size={13} />}</span><div><strong>{item}</strong><small>{i < 3 ? 'Complete' : 'Coming up next'}</small></div></div>)}</div>}</form></ToolShell> }

function Contact() { const [sent, setSent] = useState(false); return <section className="contact-page"><div className="shell contact-grid"><div><Eyebrow icon={Headphones}>LET'S TALK</Eyebrow><h1>Bring us the route you are thinking about.</h1><p>Share your volume, your destinations or the operational snag you want to untangle. We will help map a clearer way forward.</p><div className="contact-details"><a href="tel:+918487881121"><Phone /> +91 84878 81121</a><a href="mailto:hello@fastshipindia.com"><Mail /> hello@fastshipindia.com</a><span><MapPin /> Ahmedabad, Gujarat, India</span></div></div><form className="contact-form" onSubmit={e => { e.preventDefault(); setSent(true); e.currentTarget.reset() }}><Eyebrow icon={Sparkles}>START A CONVERSATION</Eyebrow><label>Your name<input required name="name" placeholder="Full name" /></label><label>Work email<input required type="email" name="email" placeholder="you@company.com" /></label><label>What are you moving?<textarea required rows="5" name="message" placeholder="Tell us a little about the journey" /></label><button className="button button-coral full" type="submit">Send enquiry <ArrowRight size={17} /></button>{sent && <p className="success"><CircleCheck size={16} /> Thanks, we will be in touch shortly.</p>}</form></div></section> }

function FinalCta() { return <section className="final-cta"><div className="shell final-cta-inner"><div><Eyebrow icon={Zap}>READY WHEN YOU ARE</Eyebrow><h2>Make the next move<br /><em>your best one.</em></h2></div><ButtonLink dark>Calculate a route</ButtonLink></div></section> }

function Footer() { return <footer><div className="shell footer-grid"><div><Logo light /><p>Shipping infrastructure with a little more clarity, care and momentum.</p><div className="socials"><a href="#" aria-label="LinkedIn"><Linkedin /></a><a href="#" aria-label="Instagram"><Instagram /></a></div></div><div><h4>Explore</h4><Link to="/integrations">Platform</Link><Link to="/integrations/courier-partners">Courier network</Link><Link to="/blogs">Journal</Link></div><div><h4>Tools</h4><Link to="/rate-calculator">Rate calculator</Link><Link to="/weight-calculator">Weight calculator</Link><Link to="/tracking">Track a parcel</Link></div><div><h4>Say hello</h4><a href="mailto:hello@fastshipindia.com">hello@fastshipindia.com</a><a href="tel:+918487881121">+91 84878 81121</a><Link to="/contact">Contact page <ArrowRight size={14} /></Link></div></div><div className="shell footer-bottom"><span>© 2026 Fastship India</span><span>Privacy · Terms · Security</span></div></footer> }

export default function App() { return <><ScrollTop /><Header /><main><Routes><RouterRoute path="/" element={<Home />} /><RouterRoute path="/integrations" element={<StandardPage type="integrations" />} /><RouterRoute path="/integrations/sales-channels" element={<StandardPage type="salesChannels" />} /><RouterRoute path="/integrations/courier-partners" element={<StandardPage type="courierPartners" />} /><RouterRoute path="/blogs" element={<StandardPage type="blogs" />} /><RouterRoute path="/about" element={<StandardPage type="about" />} /><RouterRoute path="/weight-calculator" element={<WeightCalculator />} /><RouterRoute path="/rate-calculator" element={<RateCalculator />} /><RouterRoute path="/tracking" element={<Tracking />} /><RouterRoute path="/contact" element={<Contact />} /><RouterRoute path="*" element={<Home />} /></Routes></main><Footer /></> }
