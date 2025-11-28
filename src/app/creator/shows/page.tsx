import { redirect } from 'next/navigation';

export default function CreatorShowsRedirect() {
  redirect('/creator/streams/paid');
}
