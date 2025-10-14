import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the authenticated home page
  redirect('/home');
}

