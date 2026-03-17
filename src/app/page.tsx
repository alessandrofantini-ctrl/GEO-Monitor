import { redirect } from 'next/navigation';

// WHY: nessuna landing page — tool interno, accesso diretto al dashboard (ADR-0003)
export default function Home() {
  redirect('/dashboard');
}
