import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, Modal, Alert, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickWorkPhoto } from '../photos/pickWorkPhoto';

export interface PortfolioProject { id?: string; title: string; description?: string; images: string[]; visible?: boolean; image_base64?: string; }
interface Props {
  projects: PortfolioProject[];
  editable?: boolean;
  optional?: boolean;
  onAdd?: (project: PortfolioProject) => Promise<void> | void;
  onHide?: (project: PortfolioProject) => Promise<void> | void;
  onDelete?: (project: PortfolioProject) => Promise<void> | void;
}
export default function PortfolioProjects({ projects, editable, optional, onAdd, onHide, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<PortfolioProject | null>(null);
  const [gallery, setGallery] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { width, height } = useWindowDimensions();
  const closeEditor = () => { if (!busy) setEditing(false); };
  const run = async (action: () => Promise<void> | void) => {
    if (busy) return;
    setBusy(true);
    try { await action(); } catch (error) { Alert.alert('Could not save project', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const addPhoto = async () => {
    await run(async () => {
      const image = await pickWorkPhoto();
      if (image) setImages(previous => [...previous, image].slice(0, 10));
    });
  };
  const photos = (project: PortfolioProject) => project.images?.length ? project.images : project.image_base64 ? [project.image_base64.startsWith('data:') ? project.image_base64 : `data:image/jpeg;base64,${project.image_base64}`] : [];
  const imageError = () => Alert.alert('Photo unavailable', 'This photo could not be displayed. Try selecting a JPEG or PNG copy.');
  return <View style={s.section}>
    <Text style={s.heading}>Portfolio{optional ? ' (Optional)' : ''}</Text>
    {optional && <Text style={s.muted}>Add separate projects, each with a title, description and up to 10 photos.</Text>}
    {projects.map((project, index) => <View style={s.card} key={project.id || index}>
      <TouchableOpacity accessibilityLabel={`Open project ${project.title}`} onPress={() => setSelected(project)}>
        {!!photos(project)[0] && <Image source={{ uri: photos(project)[0] }} style={s.cover} onError={imageError} />}
        <Text style={s.title}>{project.title}</Text>
        <Text style={s.muted}>{photos(project).length} photos{project.visible === false ? ' · Hidden from clients' : ''}</Text>
      </TouchableOpacity>
      {editable && <View style={s.row}>
        {onHide && <TouchableOpacity disabled={busy} onPress={() => run(() => onHide(project))}><Text style={s.link}>{project.visible === false ? 'Show to clients' : 'Hide from clients'}</Text></TouchableOpacity>}
        {onDelete && <TouchableOpacity disabled={busy} onPress={() => Alert.alert('Delete project?', project.title, [{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:() => run(() => onDelete(project))}])}><Text style={s.link}>Delete</Text></TouchableOpacity>}
      </View>}
    </View>)}
    {!projects.length && <Text style={s.muted}>No projects added yet.</Text>}
    {editable && <TouchableOpacity style={s.button} disabled={busy} onPress={() => {setTitle('');setDescription('');setImages([]);setEditing(true);}}><Text style={s.buttonText}>+ Add Project</Text></TouchableOpacity>}
    <Modal visible={editing} animationType="slide" onRequestClose={closeEditor}>
      <SafeAreaView style={s.page}>
        <View style={s.header}><Text style={s.heading}>Add Portfolio Project</Text><TouchableOpacity disabled={busy} accessibilityLabel="Close project editor" onPress={closeEditor}><Text style={s.close}>×</Text></TouchableOpacity></View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Photos (up to 10)</Text>
          <View style={s.grid}>{images.map((uri,index) => <View key={index}><Image source={{uri}} style={s.thumb} onError={imageError}/><TouchableOpacity disabled={busy} style={s.remove} accessibilityLabel={`Remove photo ${index+1}`} onPress={() => setImages(previous => previous.filter((_,i) => i!==index))}><Text style={s.buttonText}>×</Text></TouchableOpacity></View>)}</View>
          {images.length<10 && <TouchableOpacity disabled={busy} style={s.button} onPress={addPhoto}><Text style={s.buttonText}>Add Photo</Text></TouchableOpacity>}
          {busy && <ActivityIndicator color="#FF6A00"/>}
          <Text style={s.title}>Project Title *</Text><TextInput style={s.input} value={title} onChangeText={setTitle} maxLength={150} placeholder="e.g. Kitchen Renovation" />
          <Text style={s.title}>Description (Optional)</Text><TextInput style={[s.input,{minHeight:100}]} multiline value={description} onChangeText={setDescription} maxLength={5000} placeholder="Describe the work you completed" textAlignVertical="top"/>
          <TouchableOpacity disabled={busy || !title.trim() || !images.length} style={[s.button, (busy || !title.trim() || !images.length) && {opacity:0.4}]} onPress={() => run(async () => { await onAdd?.({title:title.trim(),description:description.trim(),images,visible:true});setEditing(false);})}><Text style={s.buttonText}>Add to Portfolio</Text></TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={closeEditor}><Text style={s.link}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => {setGallery(null);setSelected(null);}}>
      <SafeAreaView style={s.page}>
        {selected && <>
          <View style={s.header}><Text style={[s.heading,{flex:1}]}>{selected.title}</Text><TouchableOpacity accessibilityLabel="Close project" onPress={() => {setGallery(null);setSelected(null);}}><Text style={s.close}>×</Text></TouchableOpacity></View>
          {gallery === null ? <ScrollView contentContainerStyle={s.content}>
            {!!selected.description && <Text style={s.description}>{selected.description}</Text>}
            {photos(selected).map((uri,index) => <TouchableOpacity key={index} accessibilityLabel={`Open photo ${index+1} full screen`} onPress={() => setGallery(index)}><Image source={{uri}} style={[s.projectPhoto,{width:width-40}]} resizeMode="cover" onError={imageError}/></TouchableOpacity>)}
          </ScrollView> : <View style={s.gallery}>
            <ScrollView key={`${gallery}-${width}`} horizontal pagingEnabled contentOffset={{x:gallery*width,y:0}} showsHorizontalScrollIndicator={false}>
              {photos(selected).map((uri,index) => <View key={index} style={{width,height:height-190,justifyContent:'center'}}><Image source={{uri}} resizeMode="contain" style={{width,height:height-230}} onError={imageError}/><Text style={s.counter}>{index+1} / {photos(selected).length}</Text></View>)}
            </ScrollView>
            <TouchableOpacity accessibilityLabel="Close full-screen photos" onPress={() => setGallery(null)}><Text style={s.counter}>× Close photos</Text></TouchableOpacity>
          </View>}
        </>}
      </SafeAreaView>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
 section:{marginVertical:20},heading:{fontSize:22,fontWeight:'700',color:'#222'},muted:{color:'#666',marginVertical:8},card:{padding:14,borderRadius:16,backgroundColor:'#fff',borderWidth:1,borderColor:'#eee',marginVertical:8},cover:{width:'100%',height:150,borderRadius:10},title:{fontSize:16,fontWeight:'600',marginVertical:10,color:'#222'},row:{flexDirection:'row',justifyContent:'space-between'},link:{color:'#CF4E00',paddingVertical:12},button:{backgroundColor:'#FF6A00',borderRadius:12,padding:15,alignItems:'center',marginVertical:10},buttonText:{color:'#fff',fontWeight:'700'},page:{flex:1,backgroundColor:'#fff'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:20,gap:15},close:{fontSize:34,color:'#555'},content:{padding:20,paddingBottom:50},input:{borderWidth:1,borderColor:'#ddd',padding:14,borderRadius:10,color:'#222'},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},thumb:{width:80,height:80,borderRadius:8},remove:{position:'absolute',right:0,top:0,backgroundColor:'#C22',padding:4,borderRadius:12},description:{fontSize:16,lineHeight:24,color:'#333',marginBottom:16},projectPhoto:{height:240,borderRadius:12,marginBottom:12},gallery:{flex:1,backgroundColor:'#000'},counter:{color:'#fff',textAlign:'center',padding:12}
});
