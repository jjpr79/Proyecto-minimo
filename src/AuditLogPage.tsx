import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ArrowLeft, Clock } from 'lucide-react';

interface LogData {
  id: string;
  action: string;
  performedBy: string;
  timestamp: any;
}

export default function AuditLogPage({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const logsSnap = await getDocs(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')));
        const logData = logsSnap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as LogData[];
        setLogs(logData);
      } catch (e) {
        console.error("Error fetching logs:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between gap-2 p-[5px] border-b border-slate-200">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="font-bold">Historial</div>
        <div className="w-10"></div>
      </header>

      <div className="p-6">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {logs.map(log => (
            <div key={log.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-sm">{log.action}</p>
                <p className="text-xs text-slate-500">Por: {log.performedBy}</p>
                <p className="text-xs text-slate-400">{log.timestamp?.toDate().toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
