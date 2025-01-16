$(function() {
	
	let previousCoin = $('#coinSelect').val(); // Initialize the previous coin

    // Configure coin settings
    function configureCoin(coin) {
        if (coin === 'bitcoin') {
            coinjs.pub = 0x00;        // Bitcoin public address prefix
            coinjs.priv = 0x80;       // Bitcoin private key prefix
            coinjs.multisig = 0x05;   // Bitcoin multisig address prefix
            coinjs.host = 'https://blockchain.info/';
        } else if (coin === 'dogecoin') {
            coinjs.pub = 0x1e;        // Dogecoin public address prefix ('D')
            coinjs.priv = 0x9e;       // Dogecoin private key prefix
            coinjs.multisig = 0x16;   // Dogecoin multisig address prefix
            coinjs.host = 'https://dogechain.info/api/v1/';
        }
        console.log('Coin configured for:', coin);
    }

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
		var tx = coinjs.transaction();
		var txID = $('#txID').val().trim();
		var code = $('#step3code').val().trim();
		var address1 = $('#finalAddress1').val().trim();
		var amount1 = parseFloat($('#step3amount1').val());
		var address2 = $('#finalAddress2').val().trim();
		var amount2 = parseFloat($('#step3amount2').val());
		var privkeyHex = $('#privKey').val().trim();
	
		// Validation for required fields
		if (!txID || !code || !address1 || isNaN(amount1) || !privkeyHex) {
			alert("Please fill in all required fields.");
			return;
		}
	
	
		try {
			// Parse the 2crow code
			var codeArray = code.split('_');
			console.log("Parsed 2crow code:", codeArray);
	
			if (codeArray.length < 3 || codeArray[0] !== '2crow' || codeArray[1] !== '2') {
				alert("Invalid 2crow code format.");
				return;
			}
	
			var redeemScript = codeArray[2];
	
	
			// Add inputs and outputs
			tx.addinput(txID, 0, redeemScript); // Pass the redeem script
			tx.addoutput(address1, amount1);
			if (amount2 >= 0.00000001 && address2) tx.addoutput(address2, amount2);
	
			// Serialize and sign the transaction
			var rawtx = tx.serialize();
			var tx2 = coinjs.transaction();
			var t = tx2.deserialize(rawtx);
	
			// Sign the transaction using the private key
			var signed = t.sign(privkeyHex);
	
			// Display the signed transaction
			$("#step3result").html('2crow_3_' + signed);
		} catch (e) {
			console.error("Error during transaction processing:", e);
			alert("An error occurred: " + (e.message || e));
		}
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

});
