<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PayPalController extends Controller
{
    public function createOrder(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric',
            'description' => 'required',
        ]);

        $clientId = 'AUPFXnzHKdf61oJkarbtIzErFoGW-dEBFWUS74h-WjbQ6JDtJ5yv85XL36u04d_Jn_4nKEgRPZjxsrHB';
        $secret = 'EGusJHziEauS9yuXV4-WMK9qBX1RoUDjxrCf-3PWrJ-CJ-itFXXggtQwl7_NXmeN3PKzTSbh8e6jj06y';
        $mode = env('PAYPAL_MODE', 'sandbox');

        $baseUrl = $mode === 'sandbox'
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        try {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/v1/oauth2/token');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_USERPWD, $clientId . ':' . $secret);
            curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: application/json',
                'Content-Type: application/x-www-form-urlencoded'
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                return response()->json([
                    'success' => false,
                    'error' => 'PayPal: Credenciales inválidas'
                ], 500);
            }

            $tokenData = json_decode($response);
            $accessToken = $tokenData->access_token;

            $orderData = [
                'intent' => 'CAPTURE',
                'purchase_units' => [[
                    'reference_id' => 'default',
                    'description' => $request->description,
                    'amount' => [
                        'currency_code' => 'USD',
                        'value' => number_format($request->amount / 6.96, 2, '.', '')
                    ]
                ]],
                'application_context' => [
                    'user_action' => 'PAY_NOW',
                    'landing_page' => 'BILLING',
                    'return_url' => 'http://localhost:8090/cliente/index.html?paypal=success',
                    'cancel_url' => 'http://localhost:8090/cliente/index.html?paypal=cancel'
                ]
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/v2/checkout/orders');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $accessToken,
                'PayPal-Request-Id: ' . uniqid()
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $orderResponse = json_decode($response, true);

            if ($httpCode === 201 || $httpCode === 200) {
                $orderId = $orderResponse['id'];
                $approveUrl = null;
                foreach ($orderResponse['links'] as $link) {
                    if ($link['rel'] === 'approve') {
                        $approveUrl = $link['href'];
                        break;
                    }
                }

                return response()->json([
                    'success' => true,
                    'orderId' => $orderId,
                    'approveUrl' => $approveUrl
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Error al crear orden de PayPal'
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function captureOrder(Request $request)
    {
        $request->validate([
            'orderID' => 'required',
        ]);

        $clientId = 'AUPFXnzHKdf61oJkarbtIzErFoGW-dEBFWUS74h-WjbQ6JDtJ5yv85XL36u04d_Jn_4nKEgRPZjxsrHB';
        $secret = 'EGusJHziEauS9yuXV4-WMK9qBX1RoUDjxrCf-3PWrJ-CJ-itFXXggtQwl7_NXmeN3PKzTSbh8e6jj06y';
        $mode = env('PAYPAL_MODE', 'sandbox');

        $baseUrl = $mode === 'sandbox'
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        try {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/v1/oauth2/token');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_USERPWD, $clientId . ':' . $secret);
            curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: application/json',
                'Content-Type: application/x-www-form-urlencoded'
            ]);

            $response = curl_exec($ch);
            curl_close($ch);

            $tokenData = json_decode($response);
            $accessToken = $tokenData->access_token;

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/v2/checkout/orders/' . $request->orderID . '/capture');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $accessToken,
                'PayPal-Request-Id: ' . uniqid()
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $captureResponse = json_decode($response, true);

            if ($httpCode === 200 || $httpCode === 201) {
                return response()->json([
                    'success' => true,
                    'data' => $captureResponse
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Error al capturar orden'
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

public function crearSuscripcion(Request $request)
    {
        try {
            $request->validate([
                'plan' => 'required'
            ]);

            $planNombre = strtolower(trim($request->plan));

            // Aceptar solo: gratis, basico, premium
            if (!in_array($planNombre, ['gratis', 'basico', 'premium'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Plan inválido. Use: gratis, basico o premium'
                ], 400);
            }

            // Buscar plan por nombre EXACTO
            $plan = DB::table('planes')
                ->whereRaw('LOWER(nombre) = ?', [$planNombre])
                ->first();

            if (!$plan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Plan no encontrado en la base de datos'
                ], 404);
            }

            $clienteCi = $request->cliente_ci;
            if (!$clienteCi) {
                return response()->json([
                    'success' => false,
                    'message' => 'cliente_ci es requerido'
                ], 400);
            }

            // Si el plan es gratis (precio = 0), crear directamente sin PayPal
            if ($plan->precio == 0) {
                DB::table('suscripciones')->insert([
                    'cliente_ci' => $clienteCi,
                    'plan_id' => $plan->id,
                    'estado' => 'activa',
                    'fecha_inicio' => now(),
                    'fecha_fin' => now()->addDays($plan->duracion_dias)
                ]);

                return response()->json([
                    'success' => true,
                    'tipo' => 'gratis',
                    'message' => 'Plan gratuito activado'
                ]);
            }

            // Para planes de pago (basico, premium), usar PayPal
            $clientId = 'AUPFXnzHKdf61oJkarbtIzErFoGW-dEBFWUS74h-WjbQ6JDtJ5yv85XL36u04d_Jn_4nKEgRPZjxsrHB';
            $secret = 'EGusJHziEauS9yuXV4-WMK9qBX1RoUDjxrCf-3PWrJ-CJ-itFXXggtQwl7_NXmeN3PKzTSbh8e6jj06y';
            $mode = env('PAYPAL_MODE', 'sandbox');

            $baseUrl = $mode === 'sandbox'
                ? 'https://api-m.sandbox.paypal.com'
                : 'https://api-m.paypal.com';

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/v1/oauth2/token');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_USERPWD, $clientId . ':' . $secret);
            curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: application/json',
                'Content-Type: application/x-www-form-urlencoded'
            ]);

            $response = curl_exec($ch);
            curl_close($ch);

            $tokenData = json_decode($response);
            $accessToken = $tokenData->access_token ?? null;

            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de conexión con PayPal'
                ], 500);
            }

            $subData = [
                'plan_id' => 'P-' . $plan->id,
                'application_context' => [
                    'return_url' => url('/cliente/index.html?suscripcion=exito'),
                    'cancel_url' => url('/cliente/index.html?suscripcion=cancel')
                ]
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/v1/billing/subscriptions');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($subData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $accessToken,
                'Prefer: return=representation'
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $subResponse = json_decode($response, true);

            if ($httpCode === 201 || $httpCode === 200) {
                return response()->json([
                    'success' => true,
                    'tipo' => 'pago',
                    'subscriptionId' => $subResponse['id'] ?? null,
                    'approveUrl' => $subResponse['links'][0]['href'] ?? null
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al crear suscripción en PayPal'
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }
}

            $plan = DB::table('planes')
                ->whereRaw('LOWER(nombre) LIKE ?', ['%' . $planNombre . '%'])
                ->first();

            if (!$plan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Plan no encontrado'
                ], 404);
            }

            $clienteCi = $request->cliente_ci;
            if (!$clienteCi) {
                return response()->json([
                    'success' => false,
                    'message' => 'cliente_ci es requerido'
                ], 400);
            }

            if ($plan->precio == 0) {
                DB::table('suscripciones')->insert([
                    'cliente_ci' => $clienteCi,
                    'plan_id' => $plan->id,
                    'estado' => 'activa',
                    'fecha_inicio' => now(),
                    'fecha_fin' => now()->addDays($plan->duracion_dias)
                ]);

                return response()->json([
                    'success' => true,
                    'tipo' => 'gratis',
                    'message' => 'Suscripción gratuita activada'
                ]);
            }

            $clientId = 'AUPFXnzHKdf61oJkarbtIzErFoGW-dEBFWUS74h-WjbQ6JDtJ5yv85XL36u04d_Jn_4nKEgRPZjxsrHB';
            $secret = 'EGusJHziEauS9yuXV4-WMK9qBX1RoUDjxrCf-3PWrJ-CJ-itFXXggtQwl7_NXmeN3PKzTSbh8e6jj06';
            $mode = env('PAYPAL_MODE', 'sandbox');

            $baseUrl = $mode === 'sandbox'
                ? 'https://api-m.sandbox.paypal.com'
                : 'https://api-m.paypal.com';

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/v1/oauth2/token');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_USERPWD, $clientId . ':' . $secret);
            curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: application/json',
                'Content-Type: application/x-www-form-urlencoded'
            ]);

            $response = curl_exec($ch);
            curl_close($ch);

            $tokenData = json_decode($response);
            $accessToken = $tokenData->access_token ?? null;

            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error de conexión con PayPal'
                ], 500);
            }

            $subData = [
                'plan_id' => 'P-' . $plan->id,
                'application_context' => [
                    'return_url' => url('/cliente/index.html?suscripcion=exito'),
                    'cancel_url' => url('/cliente/index.html?suscripcion=cancel')
                ]
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/v1/billing/subscriptions');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($subData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $accessToken,
                'Prefer: return=representation'
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $subResponse = json_decode($response, true);

            if ($httpCode === 201 || $httpCode === 200) {
                return response()->json([
                    'success' => true,
                    'subscriptionId' => $subResponse['id'] ?? null,
                    'approveUrl' => $subResponse['links'][0]['href'] ?? null
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al crear suscripción en PayPal'
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor'
            ], 500);
        }
    }
}