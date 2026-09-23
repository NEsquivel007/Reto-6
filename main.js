//----parte 1


const p = 467, g = 2;              // par de libro de texto (p primo, g generador de Z_p*)
        let x = 0, y = 0, E1 = null, E2 = null, Eres = null;

        function modpow(b, e, m) { let r = 1; b %= m; while (e > 0) { if (e & 1) r = r * b % m; e >>= 1; b = b * b % m; } return r; }
        function egcd(a, b) { if (b === 0) return [a, 1, 0]; const [g, x1, y1] = egcd(b, a % b); return [g, y1, x1 - Math.floor(a / b) * y1]; }
        function modinv(a, m) { const [g, x1] = egcd(((a % m) + m) % m, m); return ((x1 % m) + m) % m; }

        function genKeys() {
            x = 2 + Math.floor(Math.random() * (p - 4));
            y = modpow(g, x, p);
            document.getElementById('xv').textContent = x;
            document.getElementById('yv').textContent = y;
            document.getElementById('encBtn').disabled = false;
            E1 = E2 = Eres = null;
            document.getElementById('ciphers').textContent = '';
            document.getElementById('tmLog').innerHTML = '';
            document.getElementById('resultCipher').textContent = '';
            document.getElementById('tmBtn').disabled = true;
            document.getElementById('verBtn').disabled = true;
            document.getElementById('tmStatus').textContent = 'esperando cifrados…';
            setVerify('pending', 'Pendiente…');
        }


        //--------parte 2 ------

        function encrypt(m) {
            const k = 2 + Math.floor(Math.random() * (p - 3));
            return { c1: modpow(g, k, p), c2: (m * modpow(y, k, p)) % p };
        }

        function encryptBoth() {
            const m1 = +document.getElementById('m1').value, m2 = +document.getElementById('m2').value;
            if (m1 < 0 || m1 >= p || m2 < 0 || m2 >= p) { alert('m debe estar entre 0 y ' + (p - 1)); return; }
            E1 = encrypt(m1); E2 = encrypt(m2);
            document.getElementById('ciphers').innerHTML =
                `E(m₁) = (c1=${E1.c1}, c2=${E1.c2})<br>E(m₂) = (c1=${E2.c1}, c2=${E2.c2})`;
            document.getElementById('tmBtn').disabled = false;
            document.getElementById('tmStatus').textContent = 'listo para cifrar componentes';
            Eres = null;
            document.getElementById('verBtn').disabled = true;
            setVerify('pending', 'Pendiente…');
        }

        // ---- Máquina de Turing simulada (opera solo sobre bytes, nunca ve m1/m2) ----
        function toBase256(n) { const d = []; if (n === 0) d.push(0); while (n > 0) { d.push(n % 256); n = Math.floor(n / 256); } return d; }
        function fromBase256(d) { let n = 0; for (let i = d.length - 1; i >= 0; i--)n = n * 256 + d[i]; return n; }

        function tmMultiply(aD, bD, log) {
            const res = new Array(aD.length + bD.length).fill(0);
            log.push(['halt', 'q_init · cinta resultado inicializada en 0']);
            for (let i = 0; i < aD.length; i++) {
                let carry = 0;
                for (let j = 0; j < bD.length; j++) {
                    const pos = i + j, prod = aD[i] * bD[j] + res[pos] + carry;
                    res[pos] = prod % 256; carry = Math.floor(prod / 256);
                    log.push(['mult', `q_mult · celda[${pos}] = ${aD[i]}×${bD[j]}+acarreo → escribe ${res[pos]}, arrastra ${carry}`]);
                }
                let k = i + bD.length;
                while (carry > 0) {
                    const s = res[k] + carry; res[k] = s % 256; carry = Math.floor(s / 256);
                    log.push(['carry', `q_carry · propaga en celda[${k}] → ${res[k]}`]); k++;
                }
            }
            log.push(['halt', 'q_halt_mult · multiplicación base‑256 completa']);
            return res;
        }

        function tmModReduce(digits, mod, log) {
            let n = fromBase256(digits);
            log.push(['mod', `q_mod_init · N leído de la cinta = ${n}`]);
            let shift = 0, shifted = mod;
            while (shifted * 2 <= n) { shifted *= 2; shift++; }
            log.push(['mod', `q_align · alinea p×2^${shift} = ${shifted} ≤ N`]);
            while (shift >= 0) {
                if (shifted <= n) { n -= shifted; log.push(['mod', `q_sub · N≥p×2^${shift} → resta: N=${n}`]); }
                else log.push(['mod', `q_skip · N<p×2^${shift} → sin resta`]);
                shifted /= 2; shift--;
            }
            log.push(['halt', `q_halt_mod · N mod p = ${n}`]);
            return n;
        }

        function runTM() {
            const log = [];
            document.getElementById('tmStatus').textContent = 'ejecutando…';
            const c1_1 = toBase256(E1.c1), c1_2 = toBase256(E2.c1);
            const c2_1 = toBase256(E1.c2), c2_2 = toBase256(E2.c2);
            log.push(['halt', '=== Componente c1: multiplicar c1₁ × c1₂ ===']);
            const prod1 = tmMultiply(c1_1, c1_2, log);
            const c1res = tmModReduce(prod1, p, log);
            log.push(['halt', '=== Componente c2: multiplicar c2₁ × c2₂ ===']);
            const prod2 = tmMultiply(c2_1, c2_2, log);
            const c2res = tmModReduce(prod2, p, log);
            Eres = { c1: c1res, c2: c2res };
            const box = document.getElementById('tmLog');
            box.innerHTML = log.map(([t, m]) => `<div><span class="tag ${t}">${t}</span>${m}</div>`).join('');
            box.scrollTop = box.scrollHeight;
            document.getElementById('resultCipher').innerHTML =
                `Resultado (sin desencriptar): E(m₁·m₂ mod p) = (c1=${Eres.c1}, c2=${Eres.c2})`;
            document.getElementById('tmStatus').textContent = 'completado';
            document.getElementById('verBtn').disabled = false;
        }



        //parte 4

        function verify() {
            const m1 = +document.getElementById('m1').value, m2 = +document.getElementById('m2').value;
            const s = modpow(Eres.c1, x, p);
            const dec = (Eres.c2 * modinv(s, p)) % p;
            const expected = (m1 * m2) % p;
            const ok = dec === expected;
            setVerify(ok ? 'ok' : 'pending',
                `Descifrado del resultado: m = ${dec}  |  m₁·m₂ mod p esperado = ${expected}  → ` +
                (ok ? 'Propiedad homomórfica verificada: E(m₁)·E(m₂) = E(m₁·m₂ mod p)' : 'No coincide'));
        }
        function setVerify(cls, txt) { const b = document.getElementById('verifyBox'); b.className = 'verify ' + cls; b.textContent = txt; }

        genKeys();