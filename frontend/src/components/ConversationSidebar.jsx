import React from 'react';

export default function ConversationSidebar({
  user,
  conversations,
  activeConversationId,
  collapsed,
  collapseLocked,
  switchLocked,
  onSelectConversation,
  onToggleCollapse,
  onCreateConversation,
  onDeleteConversation,
  onLogout,
  loading,
}) {
  return (
    <aside
      className={`bg-[#08111f] border-r border-white/10 flex flex-col transition-all duration-200 ${
        collapsed ? 'w-full md:w-[88px] md:min-w-[88px]' : 'w-full md:w-[320px] md:min-w-[320px]'
      }`}
    >
      <div className={`border-b border-white/10 ${collapsed ? 'px-3 py-5' : 'px-5 py-5'}`}>
        <div className="flex items-center justify-between gap-2">
          {!collapsed ? (
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-300/70">Session</div>
          ) : (
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-300/70">Nav</div>
          )}
          <button
            onClick={onToggleCollapse}
            disabled={collapseLocked}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            title={collapseLocked ? 'Sidebar stays collapsed during an active timed interview' : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          >
            {collapsed ? '>' : '<'}
          </button>
        </div>
        {!collapsed ? (
          <>
            <div className="mt-3">
              <div className="text-sm font-semibold text-white">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-xs text-slate-400 mt-1">{user.email}</div>
            </div>
            <button
              onClick={onLogout}
              className="mt-4 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              Log out
            </button>
          </>
        ) : (
          <button
            onClick={onLogout}
            className="mt-4 w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5"
            title="Log out"
          >
            Out
          </button>
        )}
      </div>

      <div className={`${collapsed ? 'px-3 py-5' : 'px-5 py-5'} border-b border-white/10`}>
        <button
          onClick={onCreateConversation}
          disabled={loading || switchLocked}
          className="w-full rounded-2xl bg-cyan-400 text-slate-950 py-3 text-sm font-medium disabled:opacity-50"
          title={switchLocked ? 'Pause or stop the active timed interview before starting another one' : 'Create a practice interview'}
        >
          {collapsed ? 'New' : 'New Practice Interview'}
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
        {!collapsed ? (
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500 px-2 pb-3">Practice Interviews</div>
        ) : null}
        <div className="space-y-2">
          {conversations.map((conversation) => {
            const active = conversation.id === activeConversationId;
            return (
              <div
                key={conversation.id}
                className={`rounded-2xl border transition ${
                  active
                    ? 'border-cyan-400/40 bg-cyan-400/10'
                    : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full text-left ${collapsed ? 'px-3 py-3' : 'px-4 py-3'}`}
                  title={collapsed ? conversation.name : undefined}
                >
                  {collapsed ? (
                    <div className="text-center text-xs font-semibold text-white truncate">
                      {conversation.name.slice(0, 2).toUpperCase()}
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-white truncate">{conversation.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(conversation.created_at).toLocaleString()}
                      </div>
                      <div className="mt-2 flex gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        {conversation.job_description_text ? <span>JD</span> : null}
                        {conversation.extra_details ? <span>Notes</span> : null}
                      </div>
                    </>
                  )}
                </button>
                {!collapsed ? (
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => onDeleteConversation(conversation.id)}
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
