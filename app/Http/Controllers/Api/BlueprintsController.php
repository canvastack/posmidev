<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class BlueprintsController extends Controller
{
    public function index(Request $request, string $tenantId)
    {
        Gate::authorize('blueprints.view');
        $target = $request->query('target', 'customer');
        $items = DB::table('eav_blueprints')
            ->where('tenant_id', $tenantId)
            ->when($target, fn($q) => $q->where('target_entity', $target))
            ->orderBy('created_at','desc')
            ->get();
        return response()->json($items);
    }

    public function store(Request $request, string $tenantId)
    {
        Gate::authorize('blueprints.create');
        $data = $request->validate([
            'target' => 'required|string',
            'name' => 'required|string',
            'fields' => 'array',
            'fields.*.key' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.type' => 'required|string',
            'fields.*.required' => 'boolean',
            'fields.*.options' => 'array',
            'fields.*.sort_order' => 'integer',
        ]);

        $blueprintId = (string) Str::uuid();
        DB::table('eav_blueprints')->insert([
            'id' => $blueprintId,
            'tenant_id' => $tenantId,
            'target_entity' => $data['target'],
            'name' => $data['name'],
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $fields = $data['fields'] ?? [];
        foreach ($fields as $i => $f) {
            DB::table('eav_fields')->insert([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'blueprint_id' => $blueprintId,
                'key' => $f['key'],
                'label' => $f['label'],
                'type' => $f['type'],
                'required' => $f['required'] ?? false,
                'options' => isset($f['options']) ? json_encode($f['options']) : null,
                'sort_order' => $f['sort_order'] ?? $i,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $bp = DB::table('eav_blueprints')->where('id', $blueprintId)->first();
        $bp->fields = DB::table('eav_fields')->where('blueprint_id', $blueprintId)->orderBy('sort_order')->get();
        return response()->json($bp, 201);
    }

    public function show(string $tenantId, string $id)
    {
        Gate::authorize('blueprints.view');
        $bp = DB::table('eav_blueprints')->where('tenant_id', $tenantId)->where('id', $id)->first();
        if (!$bp) return response()->json(['message' => 'Not found'], 404);
        $bp->fields = DB::table('eav_fields')->where('blueprint_id', $id)->orderBy('sort_order')->get();
        return response()->json($bp);
    }

    public function update(Request $request, string $tenantId, string $id)
    {
        Gate::authorize('blueprints.update');
        $data = $request->validate([
            'name' => 'sometimes|string',
            'status' => 'sometimes|string',
        ]);
        $affected = DB::table('eav_blueprints')
            ->where('tenant_id', $tenantId)->where('id', $id)
            ->update(array_merge($data, ['updated_at' => now()]));
        if (!$affected) return response()->json(['message' => 'Not found'], 404);
        return $this->show($tenantId, $id);
    }

    public function addField(Request $request, string $tenantId, string $id)
    {
        Gate::authorize('blueprints.update');
        $f = $request->validate([
            'key' => 'required|string',
            'label' => 'required|string',
            'type' => 'required|string',
            'required' => 'boolean',
            'options' => 'array',
            'sort_order' => 'integer',
        ]);
        DB::table('eav_fields')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'blueprint_id' => $id,
            'key' => $f['key'],
            'label' => $f['label'],
            'type' => $f['type'],
            'required' => $f['required'] ?? false,
            'options' => isset($f['options']) ? json_encode($f['options']) : null,
            'sort_order' => $f['sort_order'] ?? 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return $this->show($tenantId, $id);
    }
}