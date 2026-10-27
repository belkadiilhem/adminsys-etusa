<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/Config.php';
$c=\AdminSys\Config::load();$mode=$c['password_mode']??'hash';$min=$mode==='plain'?1:12;
if($argc<5||strlen($argv[4])<$min){fwrite(STDERR,"Usage: php create-admin.php LOGIN NOM PRENOM PASSWORD (12+ characters in hash mode)\n");exit(2);}
$s=$c['tables']['admins'];$db=new PDO($c['dsn'],$c['db_user'],$c['db_password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$stored=$mode==='plain'?$argv[4]:password_hash($argv[4],PASSWORD_DEFAULT);$q=$db->prepare('INSERT INTO ['.$s['table'].'] (['.$s['login'].'],['.$s['nom'].'],['.$s['prenom'].'],['.$s['hash'].']) VALUES (?,?,?,?)');$q->execute([$argv[1],$argv[2],$argv[3],$stored]);echo "Admin account created. Login: ".$argv[1]."\n";
