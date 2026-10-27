<?php
declare(strict_types=1);
namespace AdminSys;

final class Api {
    private \PDO $db;

    public function __construct(private array $c) {
        $this->db = new \PDO($c['dsn'], $c['db_user'], $c['db_password'], [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        ]);
    }

    private function out(mixed $value, int $status = 200): never {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($value, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    private function input(): array {
        $value = json_decode(file_get_contents('php://input'), true);
        if (!is_array($value)) $this->out(['error' => 'JSON invalide'], 400);
        return $value;
    }

    private function ident(string $value): string {
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $value)) throw new \RuntimeException('Identifiant SQL invalide');
        return '[' . $value . ']';
    }

    private function table(array $spec): string { return '[dbo].' . $this->ident($spec['table']); }

    private function idColumn(array $spec): string {
        $check = $this->db->prepare('SELECT COUNT(*) FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=? AND t.name=? AND c.name=?');
        $check->execute(['dbo', $spec['table'], $spec['id']]);
        if ((int)$check->fetchColumn() > 0) return $this->ident($spec['id']);

        $primary = $this->db->prepare('SELECT TOP 1 c.name FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id JOIN sys.tables t ON t.object_id=i.object_id JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=? AND t.name=? AND i.is_primary_key=1 AND ic.key_ordinal=1 ORDER BY ic.index_column_id');
        $primary->execute(['dbo', $spec['table']]);
        $name = $primary->fetchColumn();
        if ($name === false) {
            $fallback = $this->db->prepare('SELECT TOP 1 c.name FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=? AND t.name=? ORDER BY CASE WHEN c.is_identity=1 THEN 0 WHEN c.name=? THEN 1 ELSE 2 END, c.column_id');
            $fallback->execute(['dbo', $spec['table'], $spec['table'] === 'Direction' ? 'Code' : $spec['id']]);
            $name = $fallback->fetchColumn();
        }
        if ($name === false) throw new \RuntimeException('Aucune colonne utilisable dans la table ' . $spec['table'] . '.');
        return $this->ident((string)$name);
    }
    private function resource(string $name): array { return $this->c['tables'][$name] ?? $this->out(['error' => 'Ressource inconnue'], 404); }

    private function auth(): void {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ($headers['Authorization'] ?? $headers['authorization'] ?? '');
        if (!preg_match('/^Bearer ([A-Za-z0-9_.-]+)$/', $header, $match)) $this->out(['error' => 'Authentification requise'], 401);
        $parts = explode('.', $match[1]);
        if (count($parts) !== 2 || !hash_equals(hash_hmac('sha256', $parts[0], $this->c['secret']), $parts[1])) $this->out(['error' => 'Jeton invalide'], 401);
        $data = json_decode(base64_decode(strtr($parts[0], '-_', '+/')), true);
        if (!is_array($data) || ($data['exp'] ?? 0) < time()) $this->out(['error' => 'Session expiree'], 401);
    }

    private function clean(mixed $value, string $field): mixed {
        if (!is_scalar($value) && $value !== null) $this->out(['error' => "Valeur invalide : $field"], 422);
        if (is_string($value)) { $value = trim($value); if (mb_strlen($value) > 500) $this->out(['error' => "Valeur trop longue : $field"], 422); }
        if (in_array($field, ['Actif','ACC_CARTE','ACC_APP','ACC_AJOUT','ACC_MODIF','ACC_SUPP'], true)) {
            if (!in_array((int)$value, [0,1], true)) $this->out(['error' => "$field doit valoir 0 ou 1"], 422);
            return (int)$value;
        }
        return $value;
    }

    private function selected(array $spec): string {
        $cols = $spec['select'] ?? $spec['fields'] ?? null;
        if (!$cols) return '*';
        return implode(',', array_map(fn($column) => $this->ident($column) . ' AS ' . $this->ident($column), $cols));
    }

    private function validationError(array $errors): never {
        $this->out(['error' => 'Corrigez les champs indiqués.', 'errors' => $errors], 422);
    }

    private function validateRecord(string $resource, array &$data, string $method, ?string $id, array $spec): void {
        $tableName = $spec['table'];
        $query = $this->db->prepare('SELECT c.name, c.max_length, c.is_nullable, c.is_identity, c.default_object_id, c.is_computed, t.name AS type_name FROM sys.columns c JOIN sys.tables tb ON tb.object_id=c.object_id JOIN sys.schemas sc ON sc.schema_id=tb.schema_id JOIN sys.types t ON t.user_type_id=c.user_type_id WHERE sc.name=? AND tb.name=?');
        $query->execute(['dbo', $tableName]);
        $columns = $query->fetchAll();
        $metadata = [];
        foreach ($columns as $column) $metadata[strtolower((string)$column['name'])] = $column;
        $errors = [];

        foreach ($data as $field => $value) {
            if (is_string($value)) {
                $value = trim($value);
                $data[$field] = $value === '' ? null : $value;
            }
            if (!isset($metadata[strtolower((string)$field)])) { $errors[$field] = 'Ce champ n’existe pas dans la table.'; continue; }
            $column = $metadata[strtolower((string)$field)];
            if ($data[$field] === null) {
                if (!(bool)$column['is_nullable']) $errors[$field] = 'Ce champ est obligatoire.';
                continue;
            }
            $length = (int)$column['max_length'];
            $type = strtolower((string)$column['type_name']);
            if ($length >= 0 && is_string($data[$field])) {
                $limit = str_starts_with($type, 'n') ? intdiv($length, 2) : $length;
                if (mb_strlen($data[$field], 'UTF-8') > $limit) $errors[$field] = "Maximum $limit caractères.";
            }
        }

        if ($method === 'POST') {
            foreach ($columns as $column) {
                if ((bool)$column['is_identity'] || (bool)$column['is_computed'] || (int)$column['default_object_id'] !== 0 || (bool)$column['is_nullable']) continue;
                $field = (string)$column['name'];
                if (!array_key_exists($field, $data) || $data[$field] === null || $data[$field] === '') $errors[$field] = 'Ce champ est obligatoire.';
            }
        }

        $relations = [
            'profils' => ['IDDIRECTION' => ['directions','Code']],
            'utilisateurs' => ['CODE_PROFIL' => ['profils','CODE']],
            'references' => ['ID_DIRECTION' => ['directions','Code']],
            'ref-profils' => ['CODE_PROFIL' => ['profils','CODE'], 'CODE_REFERENCE' => ['references','CODE']],
        ];
        foreach ($relations[$resource] ?? [] as $field => [$target, $targetColumn]) {
            if (!array_key_exists($field, $data) || $data[$field] === null || $data[$field] === '') continue;
            $targetSpec = $this->resource($target);
            $sql = 'SELECT COUNT(*) FROM ' . $this->table($targetSpec) . ' WHERE LTRIM(RTRIM(' . $this->ident($targetColumn) . ')) = LTRIM(RTRIM(?))';
            $check = $this->db->prepare($sql);
            $check->execute([$data[$field]]);
            if ((int)$check->fetchColumn() === 0) $errors[$field] = 'Le code choisi n’existe pas dans la table liée.';
        }

        $uniqueKeys = [
            'directions' => [['Code']],
            'profils' => [['CODE']],
            'references' => [['CODE']],
            'ref-profils' => [['CODE_PROFIL','CODE_REFERENCE']],
        ];
        foreach ($uniqueKeys[$resource] ?? [] as $keyFields) {
            $complete = true; $values = [];
            foreach ($keyFields as $field) { if (!array_key_exists($field, $data) || $data[$field] === null) { $complete = false; break; } $values[] = $data[$field]; }
            if (!$complete) continue;
            $where = implode(' AND ', array_map(fn($field) => 'LTRIM(RTRIM(' . $this->ident($field) . ')) = LTRIM(RTRIM(?))', $keyFields));
            $params = $values;
            if ($method === 'PUT' && $id !== null) { $where .= ' AND ' . $this->ident($spec['id']) . ' <> ?'; $params[] = $id; }
            $check = $this->db->prepare('SELECT COUNT(*) FROM ' . $this->table($spec) . ' WHERE ' . $where);
            $check->execute($params);
            if ((int)$check->fetchColumn() > 0) foreach ($keyFields as $field) $errors[$field] = 'Cette valeur existe déjà.';
        }
        if ($errors) $this->validationError($errors);
    }
    public function run(): never {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin === $this->c['origin']) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Headers: Authorization, Content-Type');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        }
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
        $path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
        $path = preg_replace('#^.*?/api/?#', '', $path);
        $parts = array_values(array_filter(explode('/', $path), 'strlen'));
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        try {
            if (($parts[0] ?? '') === 'auth' && ($parts[1] ?? '') === 'login' && $method === 'POST') $this->login();
            if (strlen($this->c['secret']) < 32) $this->out(['error' => 'APP_SECRET doit contenir 32 caracteres minimum'], 503);
            $this->auth();
            $resource = $parts[0] ?? '';

            if ($resource === 'dashboard') {
                $counts = [];
                foreach (['directions','profils','utilisateurs','references','ref-profils'] as $key) {
                    $spec = $this->resource($key);
                    $counts[$key] = (int)$this->db->query('SELECT COUNT(*) FROM ' . $this->table($spec))->fetchColumn();
                }
                $this->out($counts);
            }
            if ($resource === 'permissions') $this->out($this->permissionRows());

            $spec = $this->resource($resource);
            $table = $this->table($spec);
            $idColumn = $this->idColumn($spec);
            $spec['id'] = trim($idColumn, '[]');
            $id = $parts[1] ?? null;
            $select = $this->selected($spec);

            if ($method === 'GET' && $id === null) {
                if ($resource === 'directions' && (($_GET['actifs'] ?? '') === '1')) {
                    $rows = $this->db->query("SELECT TOP (500) $select, $idColumn AS [__ROW_ID] FROM $table WHERE [Actif]=1 ORDER BY $idColumn DESC")->fetchAll();
                    $this->out($rows);
                }
                if ($resource === 'profils') {
                    $rows = $this->db->query("SELECT TOP (500) p.[IDPROF],p.[CODE],p.[LIBELLE],p.[IDDIRECTION],p.[ACC_CARTE],p.[ACC_APP],d.[Nom] AS [DIRECTION_NOM],p.[IDPROF] AS [__ROW_ID] FROM [dbo].[PROFIL] p LEFT JOIN [dbo].[Direction] d ON LTRIM(RTRIM(d.[Code]))=LTRIM(RTRIM(p.[IDDIRECTION])) ORDER BY p.[IDPROF] DESC")->fetchAll();
                    $this->out($rows);
                }
                if ($resource === 'utilisateurs') {
                    $rows = $this->db->query("SELECT TOP (500) u.[IDUSERA],u.[NOM],u.[PRENOM],LTRIM(RTRIM(u.[CODE_PROFIL])) AS [CODE_PROFIL],p.[LIBELLE] AS [PROFIL_NOM],u.[IDUSERA] AS [__ROW_ID] FROM [dbo].[UTILISATEUR] u LEFT JOIN [dbo].[PROFIL] p ON LTRIM(RTRIM(p.[CODE]))=LTRIM(RTRIM(u.[CODE_PROFIL])) ORDER BY u.[IDUSERA] DESC")->fetchAll();
                    $this->out($rows);
                }
                if ($resource === 'references') {
                    $rows = $this->db->query("SELECT TOP (500) r.[ID_REFERENCE],r.[ID_DIRECTION],r.[CODE],r.[DONNEES_DIRECTION],r.[NOM_TABLE],d.[Nom] AS [DIRECTION_NOM],r.[ID_REFERENCE] AS [__ROW_ID] FROM [dbo].[REFERENCE] r LEFT JOIN [dbo].[Direction] d ON LTRIM(RTRIM(d.[Code]))=LTRIM(RTRIM(r.[ID_DIRECTION])) ORDER BY r.[ID_REFERENCE] DESC")->fetchAll();
                    $this->out($rows);
                }
                if ($resource === 'ref-profils') {
                    $rows = $this->db->query("SELECT TOP (500) rp.[ID_REFPROFIL],rp.[LIBELLE],rp.[CODE_PROFIL],LTRIM(RTRIM(rp.[CODE_REFERENCE])) AS [CODE_REFERENCE],rp.[ACC_AJOUT],rp.[ACC_MODIF],rp.[ACC_SUPP],p.[LIBELLE] AS [PROFIL_NOM],r.[DONNEES_DIRECTION] AS [REFERENCE_NOM],r.[NOM_TABLE],r.[ID_DIRECTION],d.[Nom] AS [DIRECTION_NOM],rp.[ID_REFPROFIL] AS [__ROW_ID] FROM [dbo].[REF_PROFIL] rp LEFT JOIN [dbo].[PROFIL] p ON LTRIM(RTRIM(p.[CODE]))=LTRIM(RTRIM(rp.[CODE_PROFIL])) LEFT JOIN [dbo].[REFERENCE] r ON LTRIM(RTRIM(r.[CODE]))=LTRIM(RTRIM(rp.[CODE_REFERENCE])) LEFT JOIN [dbo].[Direction] d ON LTRIM(RTRIM(d.[Code]))=LTRIM(RTRIM(r.[ID_DIRECTION])) ORDER BY rp.[ID_REFPROFIL] DESC")->fetchAll();
                    $this->out($rows);
                }
                $this->out($this->db->query("SELECT TOP (500) $select, $idColumn AS [__ROW_ID] FROM $table ORDER BY $idColumn DESC")->fetchAll());
            }
            if ($method === 'GET' && $id !== null) {
                $query = $this->db->prepare("SELECT $select FROM $table WHERE $idColumn=?");
                $query->execute([$id]);
                $row = $query->fetch();
                $this->out($row ?: ['error' => 'Introuvable'], $row ? 200 : 404);
            }
            if (in_array($method, ['POST','PUT'], true)) {
                $input = $this->input();
                $data = [];
                foreach ($spec['fields'] ?? [] as $field) if (array_key_exists($field, $input)) $data[$field] = $this->clean($input[$field], $field);
                if (!$data) $this->out(['error' => 'Aucun champ valide'], 422);
                $this->validateRecord($resource, $data, $method, $id, $spec);
                $columns = array_keys($data);
                if ($method === 'POST') {
                    $query = $this->db->prepare('INSERT INTO ' . $table . ' (' . implode(',', array_map([$this,'ident'],$columns)) . ') VALUES (' . implode(',', array_fill(0,count($columns),'?')) . ')');
                    $query->execute(array_values($data));
                    $this->out(['message' => 'Creation reussie'], 201);
                }
                if ($id === null) $this->out(['error' => 'Identifiant manquant'], 400);
                $sets = implode(',', array_map(fn($field) => $this->ident($field) . '=?', $columns));
                $query = $this->db->prepare("UPDATE $table SET $sets WHERE $idColumn=?");
                $query->execute([...array_values($data), $id]);
                $this->out(['message' => 'Modification reussie']);
            }
            if ($method === 'DELETE' && $id !== null) {
                $query = $this->db->prepare("DELETE FROM $table WHERE $idColumn=?");
                $query->execute([$id]);
                if ($query->rowCount() === 0) $this->out(['error' => 'Enregistrement introuvable.'], 404);
                $this->out(['message' => 'Suppression définitive effectuée.']);
            }            $this->out(['error' => 'Methode non autorisee'], 405);
        } catch (\PDOException $exception) {
            error_log($exception->getMessage());
            $details = $exception->getMessage();
            if (str_contains($details, '2601') || str_contains($details, '2627')) $message = 'Cette valeur existe deja. Choisissez une valeur differente.';
            elseif (str_contains($details, '547')) $message = 'Suppression impossible : cet enregistrement est encore utilisé par des données liées. Supprimez d’abord ces données, puis réessayez.';
            elseif (str_contains($details, '2628') || str_contains($details, '8152')) $message = 'Une valeur depasse la longueur autorisee.';
            elseif (str_contains($details, '515')) $message = 'Un champ obligatoire est vide.';
            else $message = ($this->c['env'] ?? '') === 'development' ? $details : 'Erreur de base de donnees';
            $this->out(['error' => $message], 409);
        } catch (\Throwable $exception) {
            error_log($exception->getMessage());
            $this->out(['error' => ($this->c['env'] ?? '') === 'development' ? $exception->getMessage() : 'Erreur interne'], 500);
        }
    }

    private function permissionRows(): array {
        return $this->db->query('SELECT p.[CODE] AS [PROFIL],rp.[CODE_REFERENCE],r.[ID_DIRECTION],r.[DONNEES_DIRECTION],r.[NOM_TABLE],rp.[ACC_AJOUT],rp.[ACC_MODIF],rp.[ACC_SUPP] FROM [dbo].[REF_PROFIL] rp JOIN [dbo].[PROFIL] p ON p.[CODE]=rp.[CODE_PROFIL] LEFT JOIN [dbo].[REFERENCE] r ON r.[CODE]=rp.[CODE_REFERENCE] ORDER BY p.[CODE],r.[NOM_TABLE],r.[CODE]')->fetchAll();
    }

    private function login(): never {
        $input = $this->input();
        $spec = $this->c['tables']['admins'];
        $sql = 'SELECT TOP 1 ' . $this->ident($spec['id']) . ' AS uid,' . $this->ident($spec['login']) . ' AS login,' . $this->ident($spec['hash']) . ' AS password_value,' . $this->ident($spec['nom']) . ' AS nom,' . $this->ident($spec['prenom']) . ' AS prenom FROM ' . $this->table($spec) . ' WHERE ' . $this->ident($spec['login']) . '=?';
        $query = $this->db->prepare($sql);
        $query->execute([trim((string)($input['login'] ?? ''))]);
        $admin = $query->fetch();
        $password = (string)($input['password'] ?? '');
        $valid = $admin && (($this->c['password_mode'] ?? 'hash') === 'plain' ? hash_equals((string)$admin['password_value'], $password) : password_verify($password, (string)$admin['password_value']));
        if (!$valid) $this->out(['error' => 'Identifiants incorrects'], 401);
        $payload = rtrim(strtr(base64_encode(json_encode(['sub'=>$admin['uid'],'login'=>$admin['login'],'exp'=>time()+$this->c['ttl']])), '+/','-_'),'=');
        $name = trim((string)$admin['nom'] . ' ' . (string)$admin['prenom']);
        if ($name === '') $name = (string)$admin['login'];
        $initials = mb_strtoupper(mb_substr(trim((string)$admin['nom']), 0, 1, 'UTF-8') . mb_substr(trim((string)$admin['prenom']), 0, 1, 'UTF-8'), 'UTF-8');
        if ($initials === '') $initials = mb_strtoupper(mb_substr($name, 0, 1, 'UTF-8'), 'UTF-8');
        $this->out(['token'=>$payload.'.'.hash_hmac('sha256',$payload,$this->c['secret']),'user'=>['name'=>$name,'initials'=>$initials]]);
    }
}



