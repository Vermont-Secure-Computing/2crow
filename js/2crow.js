$(function() {
	
	let previousCoin = $('#coinSelect').val(); // Initialize the previous coin

    // Configure coin settings
    function configureCoin(coin) {
		if (coin === 'bitcoin') {
			coinjs.pub = 0x00;
			coinjs.priv = 0x80;
			coinjs.multisig = 0x05;
			coinjs.host = 'https://blockchain.info/';
		} else if (coin === 'dogecoin') {
			coinjs.pub = 0x1e;
			coinjs.priv = 0x9e;
			coinjs.multisig = 0x16;
			coinjs.host = 'https://dogechain.info/api/v1/';
		} else if (coin === 'litecoin') {
			coinjs.pub = 0x30;
			coinjs.priv = 0xb0;
			coinjs.multisig = 0x32;
			coinjs.host = 'https://blockcypher.com/';
			coinjs.bech32.hrp = "ltc";
		} else {
			console.error('Unsupported coin:', coin);
		}
		console.log('Coin configured for:', coin);
	}


	// console.log('Testing Bech32 Address:', isValidLitecoinAddress('ltc1qg0cl4dr6sn78j8yxfh2cnd5tv89k37lsst34kk')); // Expect true
	// console.log('Testing Legacy Address:', isValidLitecoinAddress('LTCPodGRwZSmPX6YCMECYwTJD4RfvMmijm')); // Expect true
	

    // Handle dropdown change for merchant
    $('#coinSelect').change(function () {
        const selectedCoin = $(this).val();
        const selectedLogo = $(this).find(':selected').data('logo');

        if ($('#step1resultcode').text() !== '' || $('#step2ResultAddress').text() !== '') {
            if (confirm('Changing the coin will reset your current data. Do you want to proceed?')) {
                // Clear previously generated data
                $('#step1resultcode').empty();
                $('#step1resultwif').empty();
                $('#step2ResultAddress').empty();
                $('#step2ResultRedeemScript').empty();
                $('#step2ResultPK').empty();
            } else {
                // Revert dropdown to the previous selection
                $(this).val(previousCoin);
                return;
            }
        }

        // Update coin logo and configure settings
        $('#coinLogo').attr('src', selectedLogo);
        configureCoin(selectedCoin);
        previousCoin = selectedCoin; // Update previous selection
    });

    // Merchant: Generate code on submit
    $('#merchantAddress').click(function (e) {
		e.preventDefault(); // Prevent form submission
	
		const selectedCoin = $('#coinSelect').val();
		const amount = $('#inputAmount').val();
	
		if (!amount || isNaN(amount) || amount <= 0) {
			alert('Please enter a valid amount.');
			return;
		}
	
		// Generate a new private key and convert to WIF
		const nPrivKey = coinjs.newPrivkey();
		const wif = coinjs.privkey2wif(nPrivKey);
		const nPubKey = coinjs.newPubkey(nPrivKey);
	
		// Generate the merchant's 2crow code
		const code1 = `2crow_1_${selectedCoin}_${nPubKey}_${amount}`;
	
		// Display results
		$('#step1resultcode').html(code1); // 2crow code
		$('#step1resultwif').html(wif); // Display WIF
		console.log('Generated Code:', code1);
	});

    // Customer: Process code and update dropdown
    $('#customerbegin').click(function (e) {
		e.preventDefault(); // Prevent form submission
	
		const step2code = $('#step2code').val();
	
		if (step2code) {
			const codeArray = step2code.split('_');
			if (codeArray.length >= 4 && codeArray[0] === '2crow' && codeArray[1] === '1') {
				const selectedCurrency = codeArray[2];
				const transactionAmount = codeArray[4];
	
				// Update dropdown to match the coin from the code
				$('#coinSelect').val(selectedCurrency).change();
				console.log('Updated customer coin to:', selectedCurrency);
	
				// Display extracted details
				$('#selectedCurrency').html(selectedCurrency);
				$('#transactionAmount').html(transactionAmount);
	
				// Generate customer-specific keys
				const nPrivKey = coinjs.newPrivkey();
				const wif = coinjs.privkey2wif(nPrivKey); // Convert private key to WIF
				const nPubKey = coinjs.newPubkey(nPrivKey);
				const pubkeys = [codeArray[3], nPubKey];
				const tbr = coinjs.pubkeys2MultisigAddress(pubkeys, 2);
	
				$('#step2ResultAddress').html(`Send ${transactionAmount} ${selectedCurrency.toUpperCase()} to: ${tbr.address}`);
				$('#step2ResultRedeemScript').html(`2crow_2_${tbr.redeemScript}`);
				$('#step2ResultPK').html(wif); // Display WIF instead of raw private key
				console.log('Customer Address:', tbr.address);
			} else {
				alert('Invalid code format. Please check the input.');
			}
		} else {
			alert('Please enter a valid transaction code.');
		}
	});

	$('#step3submit').click(function () {
		// try {
			const tx = coinjs.transaction();
			const txID = $('#txID').val();
			const code = $('#step3code').val();
			const privkey = $('#privKey').val();
			const address1 = $('#finalAddress1').val();
			const amount1 = parseFloat($('#step3amount1').val());
			const address2 = $('#finalAddress2').val();
			const amount2 = parseFloat($('#step3amount2').val());
	
			if (!txID || !code || !privkey || !address1 || isNaN(amount1) || amount1 <= 0) {
				throw new Error('Missing or invalid input fields');
			}
	
			const codeArray = code.split('_');
			if (codeArray.length < 3) {
				throw new Error('Invalid script code format');
			}
	
			// Add inputs and outputs
			tx.addinput(txID, 0, codeArray[2]);
			tx.addoutput(address1, amount1);
	
			if (amount2 >= 0.00000001) {
				if (!coinjs.addressDecode(address2)) {
					throw new Error('Invalid Address 2');
				}
				tx.addoutput(address2, amount2);
			}
	
			// Sign transaction
			const signedTx = tx.sign(privkey);
			console.log('Signed transaction:', signedTx);
	
			$("#step3result").html('2crow_3_' + signedTx);
				// } catch (error) {
				// 	console.error(error.message);
				// 	alert('Error: ' + error.message);
				// }
	});
	
	
	
	$('#step4submit').click(function() {
		var tx = coinjs.transaction();
		var code = $('#step4code').val();
		var privkey = $('#step4key').val();
		var codeArray = code.split('_');
		//alert(codeArray[2]);
		var t = tx.deserialize(codeArray[2]);
		//alert("added input /n " + txID + "/n" + txScript + "/n"+ txN);
		var signed = t.sign(privkey)
		//alert(signed);
		$("#step4result").html(signed);

	
		var tx2 = coinjs.transaction();
		try {
			var decode = tx2.deserialize(signed);
		//	console.log(decode);
			$("#verifyTransactionData .transactionVersion").html(decode['version']);
			$("#verifyTransactionData .transactionSize").html(decode.size()+' <i>bytes</i>');
			$("#verifyTransactionData .transactionLockTime").html(decode['lock_time']);
			$("#verifyTransactionData").removeClass("d-none");
			$("#verifyTransactionData tbody").html("");

			var h = '';
			$.each(decode.ins, function(i,o){
				var s = decode.extractScriptKey(i);
				h += '<tr>';
				h += '<td><input class="form-control" type="text" value="'+o.outpoint.hash+'" readonly></td>';
				h += '<td class="col-xs-1">'+o.outpoint.index+'</td>';
				h += '<td class="col-xs-2"><input class="form-control" type="text" value="'+Crypto.util.bytesToHex(o.script.buffer)+'" readonly></td>';
				h += '<td class="col-xs-1"> <span class="bi-'+((s.signed=='true')?'check':'x')+'-circle"></span>';
				if(s['type']=='multisig' && s['signatures']>=1){
					h += ' '+s['signatures'];
				}
				h += '</td>';
				h += '<td class="col-xs-1">';
				if(s['type']=='multisig'){
					var script = coinjs.script();
					var rs = script.decodeRedeemScript(s.script);
					h += rs['signaturesRequired']+' of '+rs['pubkeys'].length;
				} else {
					h += '<span class="bi-x-circle"></span>';
				}
				h += '</td>';
				h += '</tr>';
			});

			$(h).appendTo("#verifyTransactionData .ins tbody");

			h = '';
			$.each(decode.outs, function(i,o){

				if(o.script.chunks.length==2 && o.script.chunks[0]==106){ // OP_RETURN

					var data = Crypto.util.bytesToHex(o.script.chunks[1]);
					var dataascii = hex2ascii(data);

					if(dataascii.match(/^[\s\d\w]+$/ig)){
						data = dataascii;
					}

					h += '<tr>';
					h += '<td><input type="text" class="form-control" value="(OP_RETURN) '+data+'" readonly></td>';
					h += '<td class="col-xs-1">'+(o.value/100000000).toFixed(8)+'</td>';
					h += '<td class="col-xs-2"><input class="form-control" type="text" value="'+Crypto.util.bytesToHex(o.script.buffer)+'" readonly></td>';
					h += '</tr>';
				} else {

					var addr = '';
					if(o.script.chunks.length==5){
						addr = coinjs.scripthash2address(Crypto.util.bytesToHex(o.script.chunks[2]));
					} else {
						var pub = coinjs.pub;
						coinjs.pub = coinjs.multisig;
						addr = coinjs.scripthash2address(Crypto.util.bytesToHex(o.script.chunks[1]));
						coinjs.pub = pub;
					}

					h += '<tr>';
					h += '<td><input class="form-control" type="text" value="'+addr+'" readonly></td>';
					h += '<td class="col-xs-1">'+(o.value/100000000).toFixed(8)+'</td>';
					h += '<td class="col-xs-2"><input class="form-control" type="text" value="'+Crypto.util.bytesToHex(o.script.buffer)+'" readonly></td>';
					h += '</tr>';
				}
			});
			$(h).appendTo("#verifyTransactionData .outs tbody");

			return true;
		} catch(e) {
			return false;
		}
	});

	$('#refund1').click(function() {
		//alert("refund1");
	});

	$('#sidebarCollapse').on('click', function () {
		$('#sidebar').toggleClass('active');
	});

	$('#copyStep1code').on('click', function () {
		
	});

	$('#copyStep1PK').on('click', function () {
		
	});

	function isValidLitecoinAddress(address) {
		const litecoinLegacyRegex = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/; // Legacy addresses
		const bech32Prefix = 'ltc'; // Bech32 prefix for Litecoin
	
		if (address.startsWith(bech32Prefix)) {
			try {
	
				if (decoded.hrp !== bech32Prefix) {
					console.error(`Invalid Bech32 HRP: ${decoded.hrp}`);
					return false;
				}
	
				const witnessProgram = bech32.fromWords(decoded.data.slice(1)); // Extract witness program
				const witnessVersion = decoded.data[0]; // Witness version
				console.log('Witness Version:', witnessVersion);
				console.log('Witness Program Length:', witnessProgram.length);
	
				// Validate witness version and length
				if (witnessVersion !== 0) {
					console.error('Unsupported witness version:', witnessVersion);
					return false;
				}
	
				if (witnessProgram.length !== 20 && witnessProgram.length !== 32) {
					console.error(`Invalid Bech32 witness program length: ${witnessProgram.length}`);
					return false; // Invalid program length
				}
	
				return true; // Valid Bech32 address
			} catch (e) {
				console.error('Bech32 decoding error:', e.message);
				return false;
			}
		} else if (litecoinLegacyRegex.test(address)) {
			return true; // Valid legacy address
		}
	
		// console.error('Address is neither valid Bech32 nor legacy Litecoin format');
		// return false; // Invalid address
	}
	
	
	
	
	
	
	

	// function bech32Decode(address) {
	// 	try {
	// 		const decoded = bech32.decode(address);
	// 		const witnessVersion = decoded.data[0];
	// 		const witnessProgram = bech32.fromWords(decoded.data.slice(1));
	
	// 		if (decoded.prefix !== 'ltc') {
	// 			throw new Error(`Invalid HRP: ${decoded.prefix}, expected 'ltc'`);
	// 		}
	
	// 		if (witnessVersion !== 0) {
	// 			throw new Error('Unsupported witness version (only version 0 supported)');
	// 		}
	
	// 		if (witnessProgram.length < 2 || witnessProgram.length > 40) {
	// 			throw new Error('Invalid witness program length');
	// 		}
	
	// 		return {
	// 			hrp: decoded.prefix,
	// 			data: witnessProgram,
	// 		};
	// 	} catch (e) {
	// 		console.error('Bech32 decoding error:', e.message);
	// 		throw new Error('Invalid Bech32 address.');
	// 	}
	// }
	
	

	// function addressToScript(address) {
	// 	if (address.startsWith('ltc1')) {
	// 		// Bech32 address
	// 		const decoded = bech32Decode(address);
	// 		return coinjs.script().witnessProgram(0x00, decoded.data); // Witness version 0
	// 	} else if (address.startsWith('M') || address.startsWith('L')) {
	// 		// Legacy Litecoin address
	// 		return coinjs.script().addressToScript(address);
	// 	} else {
	// 		throw new Error("Unsupported Litecoin address format.");
	// 	}
	// }

});
