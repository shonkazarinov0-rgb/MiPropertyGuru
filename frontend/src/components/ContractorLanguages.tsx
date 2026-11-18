import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api';
const OPTIONS = ['English','French','Spanish','Russian','Ukrainian','Arabic','Mandarin','Cantonese','Hindi','Punjabi','Portuguese','Italian','Polish','Tagalog','Persian','Korean','Turkish','Hebrew'];
export default function ContractorLanguages({languages, onSaved}:{languages:string[];onSaved:()=>Promise<void>}) {
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState<string[]>([]);
  const [custom,setCustom]=useState('');
  const [busy,setBusy]=useState(false);
  const toggle=(language:string)=>setDraft(previous=>previous.includes(language)?previous.filter(l=>l!==language):[...previous,language]);
  const addCustom=()=>{
    const value=custom.trim();
    if(!value)return;
    if(!draft.some(l=>l.toLowerCase()===value.toLowerCase()))setDraft(previous=>[...previous,value]);
    setCustom('');
  };
  const save=async()=>{
    if(busy)return;
    setBusy(true);
    try { await api.put('/contractors/languages',{languages:draft});await onSaved();setOpen(false); }
    catch(error){Alert.alert('Could not save languages',error instanceof Error?error.message:'Please try again.');}
    finally{setBusy(false);}
  };
  return <View>
    <View style={s.row}><Text style={s.label}>🌐 {languages.length?languages.join(', '):'Add languages'}</Text><TouchableOpacity accessibilityLabel="Add or remove languages" onPress={()=>{setDraft([...languages]);setCustom('');setOpen(true);}}><Text style={s.plus}>+</Text></TouchableOpacity></View>
    <Modal visible={open} animationType="slide" onRequestClose={()=>{if(!busy)setOpen(false);}}>
      <SafeAreaView style={s.page}>
        <View style={s.header}><Text style={s.heading}>Languages</Text><TouchableOpacity accessibilityLabel="Close language editor" disabled={busy} onPress={()=>setOpen(false)}><Text style={s.plus}>×</Text></TouchableOpacity></View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.hint}>Select languages you can use with clients. Tap a selected language to remove it.</Text>
          {Array.from(new Set([...OPTIONS,...draft])).map(language=><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:draft.includes(language)}} disabled={busy} key={language} style={s.option} onPress={()=>toggle(language)}><Text>{language}</Text><Text>{draft.includes(language)?'✓':''}</Text></TouchableOpacity>)}
          <TextInput editable={!busy} style={s.input} placeholder="Another language" value={custom} onChangeText={setCustom} maxLength={60} onSubmitEditing={addCustom}/>
          <TouchableOpacity disabled={busy||!custom.trim()} onPress={addCustom}><Text style={s.link}>+ Add this language</Text></TouchableOpacity>
          <TouchableOpacity disabled={busy||!!custom.trim()} style={[s.save,(busy||!!custom.trim())&&{opacity:0.5}]} onPress={save}>{busy?<ActivityIndicator color="#fff"/>:<Text style={s.white}>Save Languages</Text>}</TouchableOpacity>
          {!!custom.trim()&&<Text style={s.hint}>Tap “Add this language” before saving, or clear the field.</Text>}
          <TouchableOpacity disabled={busy} onPress={()=>setOpen(false)}><Text style={s.link}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </View>;
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:10,marginTop:16,padding:12,backgroundColor:'#EBF5FF',borderRadius:20},label:{color:'#1E40AF',fontWeight:'600',flexShrink:1},plus:{fontSize:30,color:'#FF6A00',paddingHorizontal:8},page:{flex:1,backgroundColor:'#fff'},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:20},heading:{fontSize:24,fontWeight:'700'},content:{padding:20},hint:{color:'#666',marginBottom:12},option:{padding:16,borderBottomWidth:1,borderColor:'#eee',flexDirection:'row',justifyContent:'space-between'},input:{borderWidth:1,borderColor:'#ddd',borderRadius:10,padding:14,marginTop:18},link:{color:'#D55400',paddingVertical:15},save:{padding:16,backgroundColor:'#FF6A00',borderRadius:12,alignItems:'center'},white:{color:'#fff',fontWeight:'700'}});
