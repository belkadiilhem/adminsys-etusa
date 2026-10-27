<?php
declare(strict_types=1);
namespace AdminSys;
final class Config {
 public static function load(): array {
  $f=dirname(__DIR__).'/.env'; if(is_file($f)) foreach(file($f,FILE_IGNORE_NEW_LINES|FILE_SKIP_EMPTY_LINES) as $line) { $line=trim($line); if($line===''||$line[0]==='#'||!str_contains($line,'=')) continue; [$k,$v]=explode('=',$line,2); if(getenv(trim($k))===false) putenv(trim($k).'='.trim(trim($v)," \t\"'")); }
  return ['origin'=>getenv('APP_ORIGIN')?:'http://localhost:4200','secret'=>getenv('APP_SECRET')?:'','ttl'=>(int)(getenv('TOKEN_TTL')?:3600),'env'=>getenv('APP_ENV')?:'production','password_mode'=>getenv('ADMIN_PASSWORD_MODE')?:'hash','dsn'=>'sqlsrv:Server='.(getenv('DB_HOST')?:'127.0.0.1').(getenv('DB_PORT')?','.getenv('DB_PORT'):'').';Database='.(getenv('DB_NAME')?:'ETUSA_Cartographie').';Encrypt='.(getenv('DB_ENCRYPT')?:'yes').';TrustServerCertificate='.(getenv('DB_TRUST_SERVER_CERTIFICATE')?:'false'),'db_user'=>getenv('DB_USER')?:'','db_password'=>getenv('DB_PASSWORD')?:'',
  // Adapter ces mappings aux DDL réels, notamment AdminSYS, UTILISATEUR et REFERENCE.
  'tables'=>['admins'=>['table'=>'AdminSYS','id'=>'IdSYS','login'=>'Login','nom'=>'Nom','prenom'=>'Prenom','hash'=>'Password'],'directions'=>['table'=>'Direction','id'=>'ID','fields'=>['Code','Nom','Actif']],'profils'=>['table'=>'PROFIL','id'=>'IDPROF','fields'=>['CODE','LIBELLE','IDDIRECTION','ACC_CARTE','ACC_APP']],'utilisateurs'=>['table'=>'UTILISATEUR','id'=>'IDUSERA','fields'=>['NOM','PRENOM','CODE_PROFIL','PASSWORD'],'select'=>['IDUSERA','NOM','PRENOM','CODE_PROFIL']],'references'=>['table'=>'REFERENCE','id'=>'ID_REFERENCE','fields'=>['ID_DIRECTION','CODE','DONNEES_DIRECTION','NOM_TABLE'],'select'=>['ID_REFERENCE','ID_DIRECTION','CODE','DONNEES_DIRECTION','NOM_TABLE']],'ref-profils'=>['table'=>'REF_PROFIL','id'=>'ID_REFPROFIL','fields'=>['LIBELLE','CODE_PROFIL','CODE_REFERENCE','ACC_AJOUT','ACC_MODIF','ACC_SUPP']]]];
 }
}

