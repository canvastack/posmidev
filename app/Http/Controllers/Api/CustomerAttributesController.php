<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;

class CustomerAttributesController extends Controller
{
    public function show(string $tenantId, string $customerId)
    {
        Gate::authorize('customers.attributes.view');

        $bp = DB::table('eav_blueprints')
            ->where('tenant_id', $tenantId)
            ->where('target_entity', 'customer')
            ->where('status', 'active')
            ->orderBy('created_at','desc')
            ->first();

        if (!$bp) return response()->json(['blueprintId' => null, 'attributes' => (object) []]);

        $fields = DB::table('eav_fields')->where('blueprint_id', $bp->id)->get()->keyBy('id');
        $values = DB::table('eav_values')
            ->where('tenant_id', $tenantId)
            ->where('blueprint_id', $bp->id)
            ->where('entity_type', 'customer')
            ->where('entity_id', $customerId)
            ->get();

        $attrs = [];
        foreach ($values as $v) {
            $type = $fields[$v->field_id]->type ?? 'string';
            $attrs[$fields[$v->field_id]->key] = match ($type) {
                'number' => $v->value_number,
                'boolean' => $v->value_boolean,
                'date' => $v->value_date,
                'json', 'enum' => $v->value_jsonb,
                default => $v->value_text,
            };
        }

        return response()->json([
            'blueprintId' => $bp->id,
            'attributes' => (object) $attrs,
        ]);
    }

    public function put(Request $request, string $tenantId, string $customerId)
    {
        Gate::authorize('customers.attributes.update');

        $bp = DB::table('eav_blueprints')
            ->where('tenant_id', $tenantId)
            ->where('target_entity', 'customer')
            ->where('status', 'active')
            ->orderBy('created_at','desc')
            ->first();
        if (!$bp) return response()->json(['message' => 'No active blueprint'], 400);

        $fields = DB::table('eav_fields')->where('blueprint_id', $bp->id)->get()->keyBy('key');
        $payload = $request->validate([
            'attributes' => 'required|array',
        ]);
        $attrs = $payload['attributes'];

        foreach ($attrs as $key => $val) {
            if (!isset($fields[$key])) continue;
            $field = $fields[$key];
            $row = [
                'tenant_id' => $tenantId,
                'blueprint_id' => $bp->id,
                'entity_type' => 'customer',
                'entity_id' => $customerId,
                'field_id' => $field->id,
                'updated_at' => now(),
            ];
            // Coercion by type
            $typed = [
                'value_text' => null,
                'value_number' => null,
                'value_boolean' => null,
                'value_date' => null,
                'value_jsonb' => null,
            ];
            switch ($field->type) {
                case 'number':
                    $typed['value_number'] = is_null($val) ? null : (float) $val;
                    break;
                case 'boolean':
                    $typed['value_boolean'] = (bool) $val;
                    break;
                case 'date':
                    $typed['value_date'] = $val ? date('Y-m-d', strtotime((string)$val)) : null;
                    break;
                case 'json':
                case 'enum':
                    $typed['value_jsonb'] = is_null($val) ? null : json_encode($val);
                    break;
                default:
                    $typed['value_text'] = is_null($val) ? null : (string) $val;
            }

            // Upsert by PK
            DB::table('eav_values')->updateOrInsert(
                [
                    'tenant_id' => $tenantId,
                    'entity_type' => 'customer',
                    'entity_id' => $customerId,
                    'field_id' => $field->id,
                ],
                array_merge($row, $typed, ['created_at' => now()])
            );
        }

        return $this->show($tenantId, $customerId);
    }
}