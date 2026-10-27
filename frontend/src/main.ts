import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Component, Injectable, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { catchError, throwError } from 'rxjs';

const API = 'http://localhost/adminsys-etusa/backend/public/api';
const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('adminsys-token');
  return next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request).pipe(catchError(error => {
    if (error.status === 401 && !request.url.includes('/auth/login')) window.dispatchEvent(new Event('adminsys-session-expired'));
    return throwError(() => error);
  }));
};

@Injectable({ providedIn: 'root' })
class DataService {
  private http = inject(HttpClient);
  request<T>(url: string) { return this.http.get<T>(`${API}/${url}`); }
  save(url: string, row: any, id?: any) {
    return id ? this.http.put(`${API}/${url}/${encodeURIComponent(id)}`, row) : this.http.post(`${API}/${url}`, row);
  }
  remove(url: string, id: any) { return this.http.delete(`${API}/${url}/${encodeURIComponent(id)}`); }
  login(login: string, password: string) { return this.http.post<any>(`${API}/auth/login`, { login, password }); }
}

const modules: any = {
  directions: { title: 'Directions', singular: 'Direction', id: '__ROW_ID', fields: [['Code','Code'],['Nom','Nom'],['Actif','Actif']], formFields: [['Code','Code'],['Nom','Nom'],['Actif','Actif']] },
  profils: { title: 'Profils', singular: 'Profil', id: '__ROW_ID', fields: [['CODE','Code'],['LIBELLE','Libellé'],['DIRECTION_NOM','Direction'],['ACC_CARTE','Accès carte'],['ACC_APP','Accès application']], formFields: [['CODE','Code'],['LIBELLE','Libellé'],['IDDIRECTION','Direction'],['ACC_CARTE','Accès carte'],['ACC_APP','Accès application']] },
  utilisateurs: { title: 'Utilisateurs', singular: 'Utilisateur', id: '__ROW_ID', fields: [['NOM','Nom'],['PRENOM','Prénom'],['PROFIL_NOM','Profil']], formFields: [['NOM','Nom'],['PRENOM','Prénom'],['CODE_PROFIL','Profil']] },
  references: { title: 'Références', singular: 'Référence', id: '__ROW_ID', fields: [['CODE','Code'],['DIRECTION_NOM','Direction'],['DONNEES_DIRECTION','Données de direction'],['NOM_TABLE','Nom de table']], formFields: [['ID_DIRECTION','Direction'],['CODE','Code'],['DONNEES_DIRECTION','Données de direction'],['NOM_TABLE','Nom de table']] },
  'ref-profils': { title: 'Autorisations', singular: 'Autorisation', id: '__ROW_ID', fields: [['LIBELLE','Libellé'],['PROFIL_NOM','Profil'],['REFERENCE_NOM','Catégorie d’autorisation'],['DIRECTION_NOM','Direction'],['ACC_AJOUT','Ajouter'],['ACC_MODIF','Modifier'],['ACC_SUPP','Supprimer']], formFields: [['LIBELLE','Libellé'],['CODE_PROFIL','Profil'],['CODE_REFERENCE','Référence'],['ACC_AJOUT','Ajouter'],['ACC_MODIF','Modifier'],['ACC_SUPP','Supprimer']] }
};

@Component({
  selector: 'app-root', standalone: true, imports: [CommonModule, FormsModule],
  template: `
  <div class="login-wrap" *ngIf="!token"><form class="login-card" (ngSubmit)="login()"><div class="brand-mark">EN</div><p class="eyebrow">ETUSA &middot; ADMINISTRATION SYST&Egrave;ME</p><h1>ETUSA NEXUS</h1><p class="muted">Connectez-vous &agrave; votre espace d'administration.</p><label>Identifiant<input name="login" [(ngModel)]="credentials.login" autocomplete="username" required></label><label>Mot de passe<div class="password-control"><input name="password" [type]="showPassword ? 'text' : 'password'" [(ngModel)]="credentials.password" autocomplete="current-password" spellcheck="false" autocapitalize="off" required><button class="password-toggle" type="button" (click)="showPassword=!showPassword" [attr.aria-label]="showPassword?'Masquer le mot de passe':'Afficher le mot de passe'" [title]="showPassword?'Masquer le mot de passe':'Afficher le mot de passe'"><svg *ngIf="!showPassword" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg><svg *ngIf="showPassword" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 5.2A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a14.8 14.8 0 0 1-3.2 4.2M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.2 0 2.3-.2 3.3-.6"></path></svg></button></div></label><button class="primary full">Se connecter <span>&rarr;</span></button><p class="error" *ngIf="error">{{error}}</p><button *ngIf="showSavedSession" class="secondary full saved-session-logout" type="button" (click)="logout()">D&eacute;connexion</button></form></div>
  <div class="shell" *ngIf="token"><aside class="sidebar" [class.open]="menuOpen"><div class="brand"><div class="brand-mark">EN</div><div><b>ETUSA NEXUS</b><small>ADMINISTRATION SYST&Egrave;ME</small></div></div><div class="nav-caption">ESPACE DE GESTION</div><button class="nav-item" [class.selected]="page==='dashboard'" (click)="navigate('dashboard')" aria-label="Accueil"><span>&#9675;</span><span class="nav-label">Accueil</span></button><ng-container *ngFor="let k of keys"><div class="nav-caption" *ngIf="k==='directions'">ORGANISATION</div><div class="nav-caption" *ngIf="k==='profils'">COMPTES ET PROFILS</div><div class="nav-caption" *ngIf="k==='references'">R&Eacute;F&Eacute;RENTIELS ET DROITS</div><button class="nav-item" [class.selected]="page===k" (click)="navigate(k)" [attr.aria-label]="modules[k].title" [title]="modules[k].title"><span>{{icons[k]}}</span><span class="nav-label desktop-label">{{modules[k].title}}</span><span class="nav-label mobile-label">{{mobileLabel(k)}}</span></button></ng-container><button class="nav-item mobile-logout" (click)="logout()" aria-label="Déconnexion" title="Déconnexion"><span>&rarr;</span><span class="nav-label">Déconnexion</span></button><div class="side-bottom"><div class="admin-chip"><div class="avatar">{{userInitials}}</div><div><b>{{user}}</b></div></div><button class="nav-item" (click)="logout()"><span>&rarr;</span>D&eacute;connexion</button></div></aside><main class="main"><header class="topbar"><button class="menu-btn" (click)="menuOpen=!menuOpen">&#9776;</button><div class="crumb">ETUSA NEXUS <span>/</span> {{breadcrumb}}</div><div class="top-right"><span class="live-dot"></span> Connect&eacute; <div class="avatar">{{userInitials}}</div></div></header>
  <section class="content" *ngIf="page==='dashboard'"><div class="heading"><div><p class="eyebrow">PILOTAGE</p><h1>Accueil</h1><p class="muted">G&eacute;rez les acc&egrave;s et les r&eacute;f&eacute;rentiels de votre organisation.</p></div></div><div class="stats"><article class="stat" *ngFor="let c of cards"><div class="stat-top"><span>{{c.label}}</span><i>{{c.icon}}</i></div><b>{{counts[c.key]??'-'}}</b><small>Enregistrements</small></article></div><div class="dashboard-panels"><article class="chart-card"><div class="panel-heading"><div><p class="eyebrow">ANALYSE DU R&Eacute;F&Eacute;RENTIEL</p><h2>R&eacute;partition des donn&eacute;es</h2><p class="muted">Vue globale des enregistrements par rubrique.</p></div><span class="chart-badge"><i></i>Aperçu global</span></div><div class="donut-layout"><div class="donut-chart" [style.background]="donutBackground"><div class="donut-center"><span>ENREGISTREMENTS</span><b>{{totalRecords}}</b><small>au total</small></div></div><div class="donut-legend"><div class="legend-row" *ngFor="let c of cards"><span class="legend-name"><i [class]="'legend-swatch swatch-' + c.key"></i>{{c.label}}</span><span class="legend-value"><b>{{counts[c.key]??0}}</b><small>{{chartPercent(c.key)|number:'1.0-0'}}%</small></span></div></div></div></article></div></section>
  <section class="content" *ngIf="page!=='dashboard'"><div class="heading"><div><p class="eyebrow">CONFIGURATION</p><h1>{{modules[page]?.title}}</h1><p class="muted">Consultez et mettez &agrave; jour les {{modules[page]?.title.toLowerCase()}}.</p></div><button class="primary" (click)="openForm()">+ Ajouter {{modules[page]?.singular.toLowerCase()}}</button></div><div class="toolbar"><div class="search">&#8981; <input [(ngModel)]="query" placeholder="Rechercher dans la liste..."></div><span>{{filtered.length}} r&eacute;sultat{{filtered.length===1?'':'s'}}</span></div><p class="table-scroll-hint">Faites glisser le tableau horizontalement pour voir toutes les colonnes.</p><div class="table-wrap"><table><thead><tr><th *ngFor="let col of columns">{{col[1]}}</th><th class="actions">Actions</th></tr></thead><tbody><tr *ngFor="let row of filtered"><td *ngFor="let col of columns"><span *ngIf="col[0]==='Actif'||col[0]==='ACTIF'" class="status" [class.off]="!isFlagOn(row[col[0]])">{{isFlagOn(row[col[0]])?'Actif':'Inactif'}}</span><span *ngIf="col[0]!=='Actif'&&col[0]!=='ACTIF'">{{row[col[0]]??'-'}}</span></td><td class="actions"><button class="icon-btn" title="Modifier" (click)="openForm(row)">&#9998;</button><button class="icon-btn danger" title="Supprimer" [attr.aria-label]="'Supprimer ' + modules[page].singular.toLowerCase()" [disabled]="deleting" (click)="remove(row)"><svg class="delete-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"></path></svg></button></td></tr><tr *ngIf="!filtered.length"><td class="empty" [attr.colspan]="columns.length+1">Aucun r&eacute;sultat. Ajoutez un enregistrement pour commencer.</td></tr></tbody></table></div></section>
  <div class="modal-back" *ngIf="editing"><form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="save()"><button type="button" class="close" (click)="editing=null">&times;</button><p class="eyebrow">{{formId?'MODIFICATION':'NOUVEAU'}}</p><h2>{{formId?'Modifier':'Ajouter'}} {{modules[page]?.singular.toLowerCase()}}</h2><p class="form-error" *ngIf="formError">{{formError}}</p><label *ngFor="let col of formFields">{{col[1]}}<select *ngIf="isSelect(col[0])" [name]="col[0]" [(ngModel)]="editing[col[0]]" [required]="isRequired(col[0])" (ngModelChange)="clearFieldError(col[0])"><option value="">-</option><option *ngFor="let opt of optionsFor(col[0])" [ngValue]="optionValue(col[0],opt)">{{optionLabel(col[0],opt)}}</option></select><input *ngIf="!isSelect(col[0])" [name]="col[0]" [(ngModel)]="editing[col[0]]" [required]="isRequired(col[0])" (ngModelChange)="clearFieldError(col[0])" [placeholder]="'Saisir '+col[1].toLowerCase()"><small class="field-error" *ngIf="fieldErrors[col[0]]">{{fieldErrors[col[0]]}}</small></label><label *ngIf="page==='utilisateurs'">Mot de passe<input name="PASSWORD" type="password" [(ngModel)]="editing['PASSWORD']" [required]="!formId" autocomplete="new-password" [placeholder]="formId?'Laisser vide pour conserver':'Saisir le mot de passe'" (ngModelChange)="clearFieldError('PASSWORD')"><small class="field-error" *ngIf="fieldErrors['PASSWORD']">{{fieldErrors['PASSWORD']}}</small></label><div class="modal-actions"><button type="button" class="secondary" (click)="editing=null">Annuler</button><button class="primary">Enregistrer <span>&rarr;</span></button></div></form></div><div class="toast" *ngIf="notice">{{notice}}</div></main></div>`
})
class AppComponent {
  private data = inject(DataService);
  token: string | null = localStorage.getItem('adminsys-token');
  showSavedSession = !!(localStorage.getItem('adminsys-token') || localStorage.getItem('adminsys-user'));
  user = localStorage.getItem('adminsys-user') || 'Administrateur';
  userInitials = localStorage.getItem('adminsys-initials') || this.makeInitials(this.user);
  page = 'dashboard'; keys = Object.keys(modules); modules = modules;
  icons: any = { directions:'\u2302', profils:'\u25c9', utilisateurs:'\u2659', references:'\u25a4', 'ref-profils':'\u25c7' };
  cards: any[] = [{key:'directions',label:'Directions',icon:'D'},{key:'profils',label:'Profils',icon:'P'},{key:'utilisateurs',label:'Utilisateurs',icon:'U'},{key:'references',label:'R\u00e9f\u00e9rences',icon:'R'},{key:'ref-profils',label:'Autorisations',icon:'A'}];
  counts: any = {}; rows: any[] = []; query = ''; editing: any = null; formId: any = null;
  error = ''; notice = ''; formError = ''; fieldErrors: any = {}; menuOpen = false; showPassword = false; deleting = false; credentials = {login:'',password:''};
  options: any = { directions: [], profils: [], references: [] };

  private makeInitials(name: string): string { return name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part => part.charAt(0).toUpperCase()).join(''); }
  private flagNumber(value: any): number {
    if (value === true) return 1;
    if (value === false || value === null || value === undefined || value === '') return 0;
    const text = String(value).trim().toLocaleLowerCase('fr');
    if (['0','false','faux','inactif','inactive','désactivé','desactive','désactivée','desactivee','disabled','off','non','n','i','d'].includes(text)) return 0;
    if (['1','true','vrai','actif','active','activé','activee','enabled','on','oui','o','a'].includes(text)) return 1;
    return Number(value) === 0 ? 0 : 1;
  }
  isFlagOn(value: any): boolean { return this.flagNumber(value) === 1; }
  mobileLabel(key: string): string {
    const labels: any = { directions: 'Direc.', profils: 'Profils', utilisateurs: 'Utilis.', references: 'Réf.', 'ref-profils': 'Autoris.' };
    return labels[key] || 'Accueil';
  }
  get donutBackground(): string {
    if (!this.totalRecords) return 'conic-gradient(#e8eef6 0% 100%)';
    const colors: any = { directions: '#4388ef', profils: '#806bea', utilisateurs: '#21a88d', references: '#f0ad45', 'ref-profils': '#e66d8c' };
    let offset = 0;
    const slices: string[] = [];
    for (const card of this.cards) {
      const value = Number(this.counts[card.key] || 0);
      if (value <= 0) continue;
      const start = offset;
      offset += value / this.totalRecords * 100;
      slices.push(colors[card.key] + ' ' + start + '% ' + offset + '%');
    }
    return 'conic-gradient(' + slices.join(', ') + ')';
  }  get totalRecords(): number { return this.cards.reduce((total, card) => total + Number(this.counts[card.key] || 0), 0); }
  chartPercent(key: string): number { return this.totalRecords ? Number(this.counts[key] || 0) / this.totalRecords * 100 : 0; }
  get populatedModules(): number { return this.cards.filter(card => Number(this.counts[card.key] || 0) > 0).length; }
  get breadcrumb() { return this.page === 'dashboard' ? "Accueil" : (modules[this.page]?.title || ''); }
  get columns() { return modules[this.page]?.fields || []; }
  get formFields() { return modules[this.page]?.formFields || this.columns; }
  get filtered() { const q = this.query.toLowerCase(); return this.rows.filter(row => JSON.stringify(row).toLowerCase().includes(q)); }

  login() {
    this.error = '';
    this.data.login(this.credentials.login, this.credentials.password).subscribe({
      next: result => { this.token = result.token; this.user = result.user.name; this.userInitials = result.user.initials; localStorage.setItem('adminsys-token', this.token!); localStorage.setItem('adminsys-user', this.user); localStorage.setItem('adminsys-initials', this.userInitials); this.showSavedSession = true; this.navigate('dashboard'); },
      error: e => this.error = e.error?.error || 'Connexion impossible'
    });
  }
  logout() { this.showSavedSession = false; localStorage.removeItem('adminsys-token'); localStorage.removeItem('adminsys-user'); localStorage.removeItem('adminsys-initials'); this.token = null; this.page = 'dashboard'; }
  navigate(page: string) {
    this.page = page; this.menuOpen = false; this.query = '';
    if (page === 'dashboard') this.data.request<any>('dashboard').subscribe({ next: result => this.counts = result, error: e => this.show(this.apiError(e, 'Chargement impossible')) });
    else { this.rows = []; this.data.request<any[]>(page).subscribe({ next: result => this.rows = result, error: e => this.show(this.apiError(e, 'Chargement impossible')) }); }
  }
  isSelect(field: string): boolean { return ['IDDIRECTION','ID_DIRECTION','CODE_PROFIL','CODE_REFERENCE','ACC_CARTE','ACC_APP','ACC_AJOUT','ACC_MODIF','ACC_SUPP','Actif'].includes(field); }
  optionsFor(field: string): any[] {
    if (field === 'IDDIRECTION' || field === 'ID_DIRECTION') return this.options.directions;
    if (field === 'CODE_PROFIL') return this.options.profils;
    if (field === 'CODE_REFERENCE') return this.options.references;
    if (['ACC_CARTE','ACC_APP','ACC_AJOUT','ACC_MODIF','ACC_SUPP','Actif'].includes(field)) return [{value:1,label:'Oui'}, {value:0,label:'Non'}];
    return [];
  }
  optionValue(field: string, option: any): any {
    if (['IDDIRECTION','ID_DIRECTION'].includes(field)) return option.Code;
    if (field === 'CODE_PROFIL') return String(option.CODE ?? '').trim();
    if (field === 'CODE_REFERENCE') return String(option.CODE ?? '').trim();
    return option.value;
  }
  optionLabel(field: string, option: any): string {
    if (['IDDIRECTION','ID_DIRECTION'].includes(field)) return `${option.Code || ''} - ${option.Nom || 'Direction'}`;
    if (field === 'CODE_PROFIL') return `${option.CODE || ''} - ${option.LIBELLE || 'Profil'}`;
    if (field === 'CODE_REFERENCE') return `${option.CODE || ''} - ${option.DONNEES_DIRECTION || option.NOM_TABLE || 'Référence'}`;
    return `${option.value} - ${option.label}`;
  }
  private loadOptions(page: string) {
    const required = new Set<string>();
    if (page === 'profils' || page === 'references') required.add('directions');
    if (page === 'utilisateurs' || page === 'ref-profils') required.add('profils');
    if (page === 'ref-profils') required.add('references');
    for (const resource of required) this.data.request<any[]>(resource === 'directions' ? 'directions?actifs=1' : resource).subscribe({
      next: rows => this.options[resource] = rows,
      error: e => this.show(this.apiError(e, 'Impossible de charger les choix liés'))
    });
  }
  openForm(row?: any) {
    this.formError = ''; this.fieldErrors = {};
    this.formId = row?.[modules[this.page].id] ?? null;
    this.editing = row ? { ...row } : Object.fromEntries(this.formFields.map((field: any) => [field[0], field[0].startsWith('ACC_') || field[0] === 'Actif' ? 1 : '']));
    if (row && this.page === 'ref-profils' && this.editing.CODE_REFERENCE != null) this.editing.CODE_REFERENCE = String(this.editing.CODE_REFERENCE).trim();
    if (row && this.page === 'utilisateurs' && this.editing.CODE_PROFIL != null) this.editing.CODE_PROFIL = String(this.editing.CODE_PROFIL).trim();
    const binaryFields = ['Actif', 'ACC_CARTE', 'ACC_APP', 'ACC_AJOUT', 'ACC_MODIF', 'ACC_SUPP'];
    for (const field of binaryFields) {
      const value = this.editing[field];
      if (value !== null && value !== undefined && value !== '') this.editing[field] = this.flagNumber(value);
    }
    if (this.page === 'utilisateurs' && !row) this.editing.PASSWORD = '';
    if (this.page === 'utilisateurs' && row) this.editing.PASSWORD = '';
    this.loadOptions(this.page);
  }
  clearFieldError(field: string) { delete this.fieldErrors[field]; this.formError = ''; }
  isRequired(field: string): boolean {
    if (field === 'PASSWORD') return !this.formId;
    if (this.page === 'ref-profils' && field === 'LIBELLE') return false;
    return this.formFields.some((item: any) => item[0] === field);
  }
  validateForm(): boolean {
    const required = this.formFields.map((item: any) => item[0]).filter((field: string) => !(this.page === 'ref-profils' && field === 'LIBELLE'));
    if (this.page === 'utilisateurs' && !this.formId) required.push('PASSWORD');
    for (const field of required) {
      const value = this.editing[field];
      if (value === null || value === undefined || String(value).trim() === '') this.fieldErrors[field] = 'Ce champ est obligatoire.';
    }
    const limits: any = { directions: {Code:10,Nom:150}, profils: {CODE:10,LIBELLE:100,IDDIRECTION:10}, 'ref-profils': {LIBELLE:150,CODE_PROFIL:10,CODE_REFERENCE:10} };
    for (const [field, limit] of Object.entries(limits[this.page] || {})) {
      const value = this.editing[field];
      if (value != null && String(value).length > Number(limit)) this.fieldErrors[field] = `Maximum ${limit} caractères.`;
    }
    return Object.keys(this.fieldErrors).length === 0;
  }
  save() {
    this.formError = ''; this.fieldErrors = {};
    if (!this.validateForm()) return;
    const payload = { ...this.editing };
    if (this.page === 'utilisateurs' && this.formId && !payload.PASSWORD) delete payload.PASSWORD;
    this.data.save(this.page, payload, this.formId).subscribe({
      next: () => { this.editing = null; this.show('Enregistrement effectué avec succès.'); this.navigate(this.page); },
      error: e => { this.fieldErrors = e.error?.errors || {}; const details = Object.entries(this.fieldErrors).map(([field, message]) => String(field) + ' : ' + String(message)).join(' '); this.formError = e.error?.error || details || 'Enregistrement impossible'; }
    });
  }
  remove(row: any) {
    if (this.deleting) return;
    const module = modules[this.page];
    const id = row?.[module.id];
    if (id === null || id === undefined || id === '') {
      this.show(`Impossible de supprimer : l’identifiant ${module.id} manque dans la ligne.`);
      return;
    }
    const action = 'supprimer';
    const confirmationLabel: any = { profils: 'ce profil', utilisateurs: 'cet utilisateur', references: 'cette référence', 'ref-profils': 'cette autorisation' };
    const question = this.page === 'directions' ? 'Voulez-vous vraiment supprimer cette direction définitivement ?' : `Voulez-vous vraiment supprimer ${confirmationLabel[this.page] || 'cet élément'} ?`;
    if (!window.confirm(question)) return;
    this.deleting = true;
    this.data.remove(this.page, id).subscribe({
      next: () => {
        this.deleting = false;
        this.show('La suppression définitive a été effectuée.');
        this.navigate(this.page);
      },
      error: e => {
        this.deleting = false;
        const message = typeof e.error === 'string' ? e.error : e.error?.error;
        const fallback = e.status === 0 ? 'Le serveur PHP ne répond pas. Vérifiez Apache/XAMPP et l’adresse de l’API.' : e.status === 401 ? 'Votre session a expiré. Reconnectez-vous.' : e.status === 404 ? 'Élément introuvable : vérifiez la clé ID configurée pour cette table.' : `Impossible de ${action} cet élément. Vérifiez les données liées et réessayez.`;
        this.show(message || fallback);
      }
    });
  }
  private apiError(e: any, fallback: string): string {
    const message = e.error?.error;
    if (typeof message === 'string' && message.trim()) return message;
    if (e.status === 0) return 'API inaccessible. Vérifiez Apache/XAMPP et l’adresse du backend.';
    return fallback + ' (HTTP ' + (e.status || 'inconnu') + '). Vérifiez SQL Server et les noms de colonnes.';
  }  show(message: string) { this.notice = message; setTimeout(() => { if (this.notice === message) this.notice = ''; }, 7000); }
  private tokenExpired(token: string): boolean {
    try {
      const encoded = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(encoded));
      return !payload.exp || payload.exp * 1000 <= Date.now();
    } catch { return true; }
  }
  constructor() {
    window.addEventListener('adminsys-session-expired', () => { this.token = null; this.showSavedSession = true; this.editing = null; this.page = 'dashboard'; this.error = 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.'; });
    if (this.token && this.tokenExpired(this.token)) {
      this.token = null;
      this.showSavedSession = true;
      this.error = 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.';
    } else if (this.token && !localStorage.getItem('adminsys-initials')) this.logout();
    else if (this.token) this.navigate('dashboard');
  }
}

bootstrapApplication(AppComponent, { providers: [provideHttpClient(withInterceptors([authInterceptor]))] }).catch(console.error);














