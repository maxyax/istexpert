
import React, { useState } from 'react';
import { Building2, UserPlus, Trash2, Mail, Shield, User, X, CheckCircle2, Save, Edit3 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';

export const CompanySettings: React.FC = () => {
  const { company, staff, addStaff, removeStaff, updateCompany, user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({ 
    name: company?.name || '', 
    inn: company?.inn || '', 
    address: company?.address || '' 
  });
  const [newMember, setNewMember] = useState({ full_name: '', email: '', role: UserRole.USER });

  // Только админ компании может редактировать настройки и добавлять пользователей
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.COMPANY_ADMIN || user?.role === UserRole.OWNER;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addStaff(newMember);
    setIsModalOpen(false);
    setNewMember({ full_name: '', email: '', role: UserRole.USER });
  };

  const handleCompanySave = () => {
    updateCompany(companyForm);
    setIsEditingCompany(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in duration-500">
       {/* Company Info */}
       <section className="p-8 md:p-12 rounded-[3rem] shadow-neo bg-neo-bg relative">
          {isAdmin && (
            <button 
              onClick={isEditingCompany ? handleCompanySave : () => setIsEditingCompany(true)}
              className={`absolute top-8 right-8 p-4 rounded-2xl shadow-neo transition-all ${isEditingCompany ? 'bg-green-500 text-white shadow-none' : 'text-blue-500 hover:shadow-neo-inset'}`}
            >
              {isEditingCompany ? <Save size={20}/> : <Edit3 size={20}/>}
            </button>
          )}

          <div className="flex items-center gap-6 mb-10">
             <div className="w-16 h-16 rounded-2xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-500"><Building2 size={32}/></div>
             <div className="flex-1">
                {isEditingCompany ? (
                  <input 
                    className="bg-neo-bg shadow-neo-inset p-3 rounded-xl font-black text-xl uppercase outline-none text-blue-500 w-full mb-2 border-none"
                    value={companyForm.name} 
                    onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                  />
                ) : (
                  <h2 className="text-2xl font-black uppercase tracking-tight">{company?.name || 'Моя компания'}</h2>
                )}
                <div className="flex items-center gap-2">
                   <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">ИНН:</span>
                   {isEditingCompany ? (
                     <input 
                        className="bg-neo-bg shadow-neo-inset p-1 px-3 rounded-lg font-black text-[10px] outline-none text-blue-500 border-none"
                        value={companyForm.inn} 
                        onChange={e => setCompanyForm({...companyForm, inn: e.target.value})}
                     />
                   ) : (
                     <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{company?.inn || '—'}</span>
                   )}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Юридический адрес</p>
                {isEditingCompany ? (
                  <textarea 
                    className="bg-transparent w-full font-bold text-xs outline-none text-blue-500 border-none"
                    value={companyForm.address} 
                    onChange={e => setCompanyForm({...companyForm, address: e.target.value})}
                  />
                ) : (
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase leading-relaxed">{company?.address || 'Адрес не указан'}</p>
                )}
             </div>
          </div>
       </section>

       {/* Staff Management */}
       <section className="space-y-6">
          <div className="flex justify-between items-center px-4">
             <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><User size={16} className="text-blue-500"/> Штат сотрудников</h3>
             {isAdmin && (
               <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 rounded-xl shadow-neo bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:shadow-neo-inset transition-all">
                  <UserPlus size={14}/> Добавить
               </button>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {staff.map(member => (
               <div key={member.id} className="p-6 rounded-[2rem] shadow-neo bg-neo-bg relative group">
                  {isAdmin && member.id !== user?.id && (
                    <button onClick={() => removeStaff(member.id)} className="absolute top-4 right-4 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                  )}
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-10 h-10 rounded-xl shadow-neo bg-neo-bg flex items-center justify-center text-gray-400 font-black text-sm uppercase">{member.full_name[0]}</div>
                     <div>
                        <h4 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase">{member.full_name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                           <Shield size={10} className="text-blue-500"/>
                           <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{member.role.replace('_', ' ')}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase">
                     <Mail size={12} className="text-gray-400"/> {member.email}
                  </div>
               </div>
             ))}
          </div>
       </section>

       {/* Add Member Modal */}
       {isModalOpen && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-neo-bg w-full max-w-lg rounded-[2.5rem] shadow-neo p-8 md:p-12 animate-in zoom-in duration-300">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black uppercase">Новый сотрудник</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400"><X size={20}/></button>
               </div>
               <form onSubmit={handleAdd} className="space-y-6">
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase ml-2">ФИО</label>
                     <input className="w-full p-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" value={newMember.full_name} onChange={e => setNewMember({...newMember, full_name: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Email</label>
                     <input type="email" className="w-full p-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Доступ / Роль</label>
                     <select className="w-full p-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none text-xs font-black uppercase border-none" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value as any})}>
                        <option value={UserRole.DRIVER}>Водитель</option>
                        <option value={UserRole.MECHANIC}>Механик</option>
                        <option value={UserRole.PROCUREMENT}>Снабженец</option>
                        <option value={UserRole.USER}>Менеджер</option>
                        <option value={UserRole.COMPANY_ADMIN}>Администратор</option>
                     </select>
                  </div>
                  <button type="submit" className="w-full py-5 rounded-2xl bg-blue-500 text-white font-black uppercase text-[10px] shadow-lg tracking-widest">Добавить в штат</button>
               </form>
            </div>
         </div>
       )}
    </div>
  );
};
