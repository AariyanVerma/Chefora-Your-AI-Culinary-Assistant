"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import PageTransition from "./components/PageTransition";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <PageTransition>{children}</PageTransition>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
