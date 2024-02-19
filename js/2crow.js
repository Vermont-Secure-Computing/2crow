$(function() {

	$('#merchantAddress').click(function() {
		// submit pressed on step 1

		var merchantAdd = $('#inputMerchantBTCAdd').val();
		var amount = $('#inputAmount').val();
		// error checking
		
		// lets generate one
		var nPrivKey = coinjs.newPrivkey();
		var nPubKey = coinjs.newPubkey(nPrivKey);
		//alert(nPrivKey);
		var wif = coinjs.privkey2wif(nPrivKey);
		//alert(nPubKey);			
				
		// now we are going to make the code
		//$('#merchantBTCAdd').removeClass('has-error');
		//$('#amount').removeClass('has-error');
		//$("#multiSigErrorMsg").css("display", "block");
		var code1 = "2crow_1_";
		code1=code1+nPubKey+"_"+amount;
		//alert(coinjs.pubkeydecompress(merchantAdd));
		$("#step1result").html(code1 + '\n\n' + wif);
		
	});

	
	$('#customerbegin').click(function() {
		var step2code = $('#step2code').val();
		
		// make a new key for customer
		var nPrivKey = coinjs.newPrivkey();
		var nPubKey = coinjs.newPubkey(nPrivKey);
		var wif = coinjs.privkey2wif(nPrivKey);
		
		// grab the merchant pubkey and make the multisig addy
		var codeArray = step2code.split('_');
		var pubkeys = [codeArray[2],nPubKey];			
		var tbr = coinjs.pubkeys2MultisigAddress(pubkeys,2);
		
		$("#step2output").html('Send '+codeArray[3]+ ' BTC to: '+ tbr.address + '\n\n2crow_2_'+ 
			tbr.redeemScript + '\n\n' + wif);
		//alert(tbr.address);	
		
	});

	$('#step3submit').click(function() {	
		var tx = coinjs.transaction();
		var txID = $('#txID').val();
		var code = $('#step3code').val();
		var address1 = $('#finalAddress1').val();
		var amount1 = $('#step3amount1').val();
		var address2 = $('#finalAddress2').val();
		var amount2 = $('#step3amount2').val();
		var privkey = $('#privKey').val();
		var codeArray = code.split('_');
		tx.addinput(txID, 0, codeArray[2]);
		//alert("added input /n " + txID + "/n" + txScript + "/n"+ txN);
		tx.addoutput(address1, amount1*1);
		if (amount2>=0.00000001)  tx.addoutput(address2, amount2*1);
		//alert("added output");
		var rawtx = tx.serialize();
		var tx2 = coinjs.transaction();
		var t = tx2.deserialize(rawtx);
		var signed = t.sign(privkey)
		//alert(signed);
		$("#step3result").html('2crow_3_'+ signed);
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
			$("#verifyTransactionData").removeClass("hidden");
			$("#verifyTransactionData tbody").html("");

			var h = '';
			$.each(decode.ins, function(i,o){
				var s = decode.extractScriptKey(i);
				h += '<tr>';
				h += '<td><input class="form-control" type="text" value="'+o.outpoint.hash+'" readonly></td>';
				h += '<td class="col-xs-1">'+o.outpoint.index+'</td>';
				h += '<td class="col-xs-2"><input class="form-control" type="text" value="'+Crypto.util.bytesToHex(o.script.buffer)+'" readonly></td>';
				h += '<td class="col-xs-1"> <span class="glyphicon glyphicon-'+((s.signed=='true')?'ok':'remove')+'-circle"></span>';
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
					h += '<span class="glyphicon glyphicon-remove-circle"></span>';
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

});
