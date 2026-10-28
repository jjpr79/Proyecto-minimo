import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, query } from 'firebase/firestore';
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
        const logsSnap = await getDocs(query(collection(db, 'auditLogs')));
        const logData = logsSnap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as LogData[];
        logData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setLogs(logData);
      } catch (e) {
        console.error("Error fetching logs:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando historial...</div>;

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 p-2 hover:bg-slate-100 rounded-full transition-colors">
        <ArrowLeft className="w-6 h-6 text-slate-600" />
        <span className="font-semibold text-slate-900">Volver</span>
      </button>

      <h2 className="text-lg font-bold mb-4">Historial de Cambios</h2>
      
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {logs.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 text-center">No hay registros de cambios aún.</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <p className="font-medium text-sm text-slate-900">{log.action}</p>
                <p className="text-xs text-slate-500">Por: {log.performedBy}</p>
                <p className="text-xs text-slate-400">{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Reciente'}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
