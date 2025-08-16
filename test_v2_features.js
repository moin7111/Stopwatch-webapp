#!/usr/bin/env node

// Test script for MainTick/ModulTick v2 features

const fetch = require('node-fetch');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const BASE_URL = 'http://localhost:3000';
let authCookie = '';
let userToken = '';

async function prompt(question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}

async function apiCall(method, path, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authCookie
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${path}`, options);
    
    // Store cookie if login/register
    if (path.includes('/auth/') && response.headers.get('set-cookie')) {
        authCookie = response.headers.get('set-cookie');
    }
    
    const data = await response.json().catch(() => ({}));
    
    return { ok: response.ok, status: response.status, data };
}

async function runTests() {
    console.log('🧪 MainTick/ModulTick v2 Feature Testing\n');
    
    try {
        // Test 1: Login
        console.log('📌 Test 1: Login');
        const username = await prompt('Username: ');
        const password = await prompt('Password: ');
        
        const loginResult = await apiCall('POST', '/auth/login', { username, password });
        if (!loginResult.ok) {
            console.error('❌ Login failed:', loginResult.data);
            return;
        }
        console.log('✅ Login successful\n');
        
        // Get user token
        const tokenResult = await apiCall('GET', '/api/user/tokens');
        if (tokenResult.ok && tokenResult.data.tokens.length > 0) {
            userToken = tokenResult.data.tokens[0].token;
            console.log(`✅ Got token: ${userToken}\n`);
        }
        
        // Test 2: Create Preset
        console.log('📌 Test 2: Creating Preset');
        const presetResult = await apiCall('POST', '/api/presets', {
            name: 'Test Lotterie',
            description: 'Test preset for lottery prediction',
            forceType: 'ms',
            forceSequence: [11, 22, 33, 44, 55],
            conditions: {
                type: 'stops',
                value: 2
            },
            trigger: 'stop'
        });
        
        if (presetResult.ok) {
            console.log('✅ Preset created successfully\n');
        } else {
            console.error('❌ Preset creation failed:', presetResult.data);
        }
        
        // Test 3: List Presets
        console.log('📌 Test 3: Listing Presets');
        const presetsResult = await apiCall('GET', '/api/presets');
        if (presetsResult.ok) {
            console.log(`✅ Found ${presetsResult.data.length} presets:`);
            presetsResult.data.forEach(p => {
                console.log(`   - ${p.name}: ${p.force_type} with ${p.force_sequence.length} values`);
            });
            console.log('');
        }
        
        // Test 4: Create Forces with new types
        console.log('📌 Test 4: Creating Forces with new types');
        
        // MS-Force
        const msForce = await apiCall('POST', `/api/data/${userToken}`, {
            force_type: 'ms',
            value: 42,
            trigger: 'stop',
            app: 'modultick'
        });
        console.log(`MS-Force: ${msForce.ok ? '✅' : '❌'}`);
        
        // S-Force (Sum)
        const sForce = await apiCall('POST', `/api/data/${userToken}`, {
            force_type: 's',
            value: 15,
            trigger: 'stop',
            app: 'modultick'
        });
        console.log(`S-Force: ${sForce.ok ? '✅' : '❌'}`);
        
        // FT-Force (Full Time)
        const ftForce = await apiCall('POST', `/api/data/${userToken}`, {
            force_type: 'ft',
            value: 1234,
            trigger: 'lap',
            app: 'modultick'
        });
        console.log(`FT-Force: ${ftForce.ok ? '✅' : '❌'}\n`);
        
        // Test 5: Force with conditions
        console.log('📌 Test 5: Creating Force with conditions');
        const condForce = await apiCall('POST', `/api/data/${userToken}`, {
            force_type: 'ms',
            value: 99,
            trigger: 'stop',
            app: 'modultick',
            conditions: {
                type: 'seconds',
                value: 5
            }
        });
        console.log(`Conditional Force: ${condForce.ok ? '✅' : '❌'}\n`);
        
        // Test 6: Check force queue
        console.log('📌 Test 6: Checking Force Queue');
        const queueResult = await apiCall('GET', `/api/data/${userToken}`);
        if (queueResult.ok) {
            console.log(`✅ Queue has ${queueResult.data.length} forces\n`);
        }
        
        // Test 7: Test URLs
        console.log('📌 Test 7: Testing new URLs');
        console.log('🔗 MainTick Login: ' + BASE_URL + '/maintick/login.html');
        console.log('🔗 MainTick Dashboard: ' + BASE_URL + '/maintick/dashboard.html');
        console.log('🔗 MainTick Stopwatch: ' + BASE_URL + '/maintick/stopwatch.html?token=' + userToken);
        console.log('🔗 ModulTick: ' + BASE_URL + '/modultick.html?token=' + userToken);
        
        console.log('\n🎉 All tests completed!');
        console.log('\n📝 Next steps:');
        console.log('1. Open MainTick Stopwatch and test manual input (triple-click display)');
        console.log('2. Test preset creation (triple-click "Löschen" button)');
        console.log('3. Open ModulTick and verify forces are applied');
        console.log('4. Test different force types and conditions');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        rl.close();
    }
}

// Run tests
runTests();