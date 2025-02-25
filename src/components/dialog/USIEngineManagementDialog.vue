<template>
  <div>
    <dialog ref="dialog">
      <div class="dialog-title">エンジン管理</div>
      <div class="dialog-form-area engine-list">
        <div v-if="engines.length === 0" class="engine">
          エンジンが登録されていません。
        </div>
        <div
          v-for="engine in engines"
          :key="engine.uri"
          class="engine"
          :value="engine.uri"
        >
          <div class="engine-name">{{ engine.name }}</div>
          <button class="dialog-narrow-button" @click="openOptions(engine.uri)">
            設定
          </button>
          <button class="dialog-narrow-button" @click="duplicate(engine.uri)">
            複製
          </button>
          <button class="dialog-narrow-button" @click="remove(engine.uri)">
            削除
          </button>
        </div>
      </div>
      <button class="dialog-wide-button" @click="add()">追加</button>
      <div class="dialog-main-buttons">
        <button class="dialog-button" @click="saveAndClose()">
          保存して閉じる
        </button>
        <button class="dialog-button" @click="cancel()">キャンセル</button>
      </div>
    </dialog>
  </div>
  <USIEngineOptionDialog
    v-if="optionDialog"
    :latest-engine-setting="optionDialog"
    @ok="optionOk"
    @cancel="optionCancel"
  />
</template>

<script lang="ts">
import {
  getUSIEngineInfo,
  loadUSIEngineSetting,
  saveUSIEngineSetting,
  showSelectUSIEngineDialog,
} from "@/ipc/renderer";
import {
  duplicateEngineSetting,
  USIEngineSetting,
  USIEngineSettings,
} from "@/settings/usi";
import { useStore } from "@/store";
import { ref, onMounted, defineComponent, Ref, computed } from "vue";
import USIEngineOptionDialog from "@/components/dialog/USIEngineOptionDialog.vue";
import { showModalDialog } from "@/helpers/dialog";

export default defineComponent({
  name: "USIEngineManagementDialog",
  components: {
    USIEngineOptionDialog,
  },
  setup() {
    const store = useStore();
    const dialog: Ref = ref(null);
    const optionDialog: Ref<USIEngineSetting | null> = ref(null);
    const setting = ref(new USIEngineSettings());

    store.retainBussyState();

    onMounted(async () => {
      showModalDialog(dialog.value);
      try {
        setting.value = await loadUSIEngineSetting();
        store.releaseBussyState();
      } catch (e) {
        store.pushError(e);
        store.closeDialog();
      }
    });

    const add = async () => {
      try {
        store.retainBussyState();
        const path = await showSelectUSIEngineDialog();
        if (!path) {
          return;
        }
        setting.value.addEngine(await getUSIEngineInfo(path));
      } catch (e) {
        store.pushError(e);
      } finally {
        store.releaseBussyState();
      }
    };

    const remove = (uri: string) => {
      setting.value.removeEngine(uri);
    };

    const openOptions = (uri: string) => {
      optionDialog.value = setting.value.getEngine(uri);
    };

    const duplicate = (uri: string) => {
      const src = setting.value.getEngine(uri);
      const engine = duplicateEngineSetting(src);
      setting.value.addEngine(engine);
    };

    const saveAndClose = async () => {
      try {
        store.retainBussyState();
        await saveUSIEngineSetting(setting.value as USIEngineSettings);
        store.closeDialog();
      } catch (e) {
        store.pushError(e);
      } finally {
        store.releaseBussyState();
      }
    };

    const cancel = () => {
      store.closeDialog();
    };

    const optionOk = (engine: USIEngineSetting) => {
      setting.value.updateEngine(engine);
      optionDialog.value = null;
    };

    const optionCancel = () => {
      optionDialog.value = null;
    };

    const engines = computed(() => setting.value.engineList);

    return {
      optionDialog,
      dialog,
      engines,
      add,
      remove,
      openOptions,
      duplicate,
      saveAndClose,
      cancel,
      optionOk,
      optionCancel,
    };
  },
});
</script>

<style scoped>
.engine-list {
  width: 620px;
  height: 400px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.engine {
  margin: 0px 5px 0px 5px;
  padding: 5px;
  border-bottom: 1px solid gray;
  display: flex;
  flex-direction: row;
}
.engine-name {
  text-align: left;
  width: 380px;
  margin-top: 5px;
  margin-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
