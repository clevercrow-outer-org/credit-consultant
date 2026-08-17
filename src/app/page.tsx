import React from 'react';
import { notFound } from 'next/navigation';
import { Home } from './components/Home';

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = searchParams ? await searchParams : {};
  if (params && params.p) {
    notFound();
  }
  return <Home />;
}

