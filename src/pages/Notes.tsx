import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../hooks/useSupabase';
import { Plus, Pencil, Trash2, StickyNote } from 'lucide-react';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';

const NOTE_COLORS = [
  { value: '#6366f1', label: 'Mor' },
  { value: '#10b981', label: 'Yeşil' },
  { value: '#f59e0b', label: 'Sarı' },
  { value: '#ef4444', label: 'Kırmızı' },
  { value: '#06b6d4', label: 'Mavi' },
  { value: '#ec4899', label: 'Pembe' },
];

export default function Notes() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { data: notes, isLoading } = useNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', color: '#6366f1' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      if (editingNote) {
        await updateNote.mutateAsync({ id: editingNote.id, ...form });
        addToast('Not güncellendi!', 'success');
      } else {
        await createNote.mutateAsync({ ...form, user_id: user.id });
        addToast('Not eklendi!', 'success');
      }
      setModalOpen(false);
      setEditingNote(null);
      setForm({ title: '', content: '', color: '#6366f1' });
    } catch (err: any) {
      addToast('Hata: ' + (err?.message || 'İşlem başarısız'), 'error');
    }
  };

  const handleEdit = (note: any) => {
    setEditingNote(note);
    setForm({ title: note.title, content: note.content, color: note.color || '#6366f1' });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu notu silmek istediğinize emin misiniz?')) {
      try {
        await deleteNote.mutateAsync(id);
        addToast('Not silindi!', 'success');
      } catch (err: any) {
        addToast('Silme hatası: ' + err.message, 'error');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Notlarım</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Fikirlerini ve hatırlatmalarını kaydet</p>
        </div>
        <button
          onClick={() => { setEditingNote(null); setForm({ title: '', content: '', color: '#6366f1' }); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <Plus size={18} />
          <span>Yeni Not</span>
        </button>
      </div>

      {notes?.length === 0 ? (
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl border border-gray-300 dark:border-slate-700 border-dashed">
          <EmptyState icon={StickyNote} title="Henüz not yok" description="Yeni bir not ekleyerek başla." />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes?.map((note) => (
            <div
              key={note.id}
              className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 border border-gray-300 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl"
                style={{ backgroundColor: note.color || '#6366f1' }}
              />
              <div className="pl-3">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">{note.title}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleEdit(note)}
                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-indigo-400 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-6">{note.content}</p>
                <p className="text-[10px] text-gray-400 mt-3">
                  {new Date(note.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingNote(null); }}
        title={editingNote ? 'Not Düzenle' : 'Yeni Not'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Başlık</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Not başlığı"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">İçerik</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
              rows={5}
              placeholder="Not içeriği..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Renk</label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, color: c.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === c.value ? 'border-white dark:border-slate-900 ring-2 ring-indigo-500 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium">
              İptal
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25">
              {editingNote ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
