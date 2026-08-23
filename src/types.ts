/* AVIORCART Admin Dashboard — shared types & ambient declarations */

interface OrderItem {
  title: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  items: OrderItem[] | null;
  amount: number | null;
  txnid: string | null;
  payment_status: string | null;
}

type OrderFilter = "all" | "success" | "failed" | "pending";
type DownloadFormat = "pdf" | "png";

interface AdminSession {
  email: string;
}

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface SupabaseAuthResponse {
  data: { user?: { email?: string } | null; session?: { user: { email: string } } | null };
  error: { message: string } | null;
}

interface SupabaseQueryResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

interface SupabaseClientLike {
  auth: {
    signInWithPassword: (creds: { email: string; password: string }) => Promise<SupabaseAuthResponse>;
    signOut: () => Promise<{ error: { message: string } | null }>;
    getSession: () => Promise<SupabaseAuthResponse>;
  };
  from: (table: string) => {
    select: (cols: string) => {
      order: (col: string, opts: { ascending: boolean }) => Promise<SupabaseQueryResponse<Order[]>>;
    };
  };
  channel: (name: string) => {
    on: (
      event: string,
      filter: { event: string; schema: string; table: string },
      callback: (payload: RealtimePayload) => void
    ) => { subscribe: () => void };
  };
}

interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Order;
  old: Partial<Order>;
}

/* CDN-provided globals (loaded via <script> tags before our compiled JS) */
declare function html2canvas(el: HTMLElement, options?: Record<string, unknown>): Promise<HTMLCanvasElement>;

interface Window {
  supabase: { createClient: (url: string, key: string) => SupabaseClientLike };
  jspdf: { jsPDF: new (opts: Record<string, unknown>) => { addImage: (...args: unknown[]) => void; save: (name: string) => void } };
}
