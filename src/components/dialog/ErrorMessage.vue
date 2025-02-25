<template>
  <div>
    <dialog ref="dialog" class="error">
      <div class="content">
        <ButtonIcon class="icon" icon="error" />
        <div class="items">
          <div class="notice">
            {{ errors.length }} 件のエラーが発生しました。
          </div>
          <div v-for="error in errors" :key="error.index" class="item">
            <p class="index">{{ error.index + 1 }} 件目</p>
            <p class="message">{{ error.message }}</p>
          </div>
        </div>
      </div>
      <div class="dialog-main-buttons">
        <button @click="onClose()">閉じる</button>
      </div>
    </dialog>
  </div>
</template>

<script lang="ts">
import { useStore } from "@/store";
import { computed, defineComponent, onMounted, ref, Ref } from "vue";
import { showModalDialog } from "@/helpers/dialog";
import ButtonIcon from "@/components/primitive/ButtonIcon.vue";

export default defineComponent({
  name: "ErrorMessage",
  components: {
    ButtonIcon,
  },
  setup() {
    const store = useStore();
    const dialog: Ref = ref(null);

    onMounted(() => {
      showModalDialog(dialog.value);
    });

    const errors = computed(() => {
      return store.errors.map((error, index) => {
        return {
          message: error.message,
          index,
        };
      });
    });

    const onClose = () => {
      store.clearErrors();
    };

    return {
      dialog,
      errors,
      onClose,
    };
  },
});
</script>

<style scoped>
.items {
  display: flex;
  flex-direction: column;
}
.item {
  margin: 10px 0px 10px 0px;
}
.index {
  font-weight: bold;
  font-size: 0.8rem;
  margin: 0px;
}
.message {
  font-size: 0.8rem;
  margin: 0px;
}
</style>

<style scoped>
dialog.error {
  color: var(--error-dialog-color);
  background-color: var(--error-dialog-bg-color);
  border: 3px solid var(--error-dialog-border-color);
}

dialog.error button {
  color: var(--error-dialog-button-color);
  background-color: var(--error-dialog-button-bg-color);
}
dialog.error button:hover {
  background-color: var(--hovered-error-dialog-button-bg-color);
}
</style>
