(function(){
  const key="aiCompanionSettings";
  const defaults={
    theme:"dark",
    compact:false,
    reducedMotion:false,
    enterToSend:true,
    sound:false,
    productUpdates:true
  };
  const load=()=>({...defaults,...JSON.parse(localStorage.getItem(key)||"{}")});
  const save=s=>localStorage.setItem(key,JSON.stringify(s));
  let state=load();

  const toast=(message)=>{
    let el=document.querySelector(".settings-toast");
    if(!el){el=document.createElement("div");el.className="settings-toast";document.body.appendChild(el)}
    el.textContent=message;clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),2200);
  };

  const apply=()=>{
    document.documentElement.dataset.acTheme=state.theme;
    document.documentElement.classList.toggle("ac-compact",!!state.compact);
    document.documentElement.classList.toggle("ac-reduced-motion",!!state.reducedMotion);
    document.querySelectorAll("[data-setting-toggle]").forEach(btn=>{
      const name=btn.dataset.settingToggle;
      btn.classList.toggle("on",!!state[name]);
      btn.setAttribute("aria-pressed",String(!!state[name]));
    });
    document.querySelectorAll("[data-setting-select]").forEach(select=>{
      select.value=state[select.dataset.settingSelect]||defaults[select.dataset.settingSelect];
    });
  };

  document.querySelectorAll("[data-tab]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const tab=btn.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===btn));
      document.querySelectorAll("[data-section]").forEach(x=>x.classList.toggle("active",x.dataset.section===tab));
      history.replaceState(null,"","#"+tab);
    });
  });

  document.addEventListener("click",e=>{
    const toggle=e.target.closest("[data-setting-toggle]");
    if(toggle){
      const name=toggle.dataset.settingToggle;
      state[name]=!state[name];save(state);apply();
      toast("Setting saved");
    }
    const clear=e.target.closest("[data-clear-local]");
    if(clear){
      if(confirm("Clear local AI Companion preferences and cached conversations on this device?")){
        ["aiCompanionRecentConversations","aiCompanionPinnedConversations",key].forEach(k=>localStorage.removeItem(k));
        state=load();apply();toast("Local data cleared");
      }
    }
    const logout=e.target.closest("[data-logout]");
    if(logout){
      fetch((window.AI_COMPANION_API_BASE||"").replace(/\/+$/,"")+"/api/auth/logout",{method:"POST",credentials:"include"})
        .finally(()=>location.href="login.html");
    }
  });

  document.querySelectorAll("[data-setting-select]").forEach(select=>{
    select.addEventListener("change",()=>{
      state[select.dataset.settingSelect]=select.value;save(state);apply();toast("Setting saved");
    });
  });

  const loadAccount=async()=>{
    try{
      const base=(window.AI_COMPANION_API_BASE||"").replace(/\/+$/,"");
      const r=await fetch(base+"/api/auth/me",{credentials:"include",cache:"no-store"});
      if(!r.ok)return;
      const d=await r.json();
      const u=d.user||{},a=d.account||{};
      document.querySelector("[data-account-name]").textContent=u.display_name||u.email||"AI User";
      document.querySelector("[data-account-email]").textContent=u.email||"";
      document.querySelector("[data-account-plan]").textContent=a.plan==="premium"?"Premium":a.plan==="premium_trial"?"Premium Trial":"Free";
      const initial=(u.display_name||u.email||"A").trim().charAt(0).toUpperCase();
      document.querySelector("[data-account-avatar]").textContent=initial;
    }catch{}
  };

  const hash=location.hash.replace("#","");
  const first=hash||"general";
  const tab=document.querySelector('[data-tab="'+first+'"]')||document.querySelector('[data-tab="general"]');
  tab?.click();
  apply();
  loadAccount();
})();